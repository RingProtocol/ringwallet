import { decode } from 'cbor-x';
import CharUtils from '../../utils/CharUtils';
import * as DbgLog from '../../utils/DbgLog';
import { safeGetItem, safeSetItem, safeKeys } from '../../utils/safeStorage';
import { isIOSWithPasscodeCapable } from '../devices/iosDetect';

interface AvailabilityResult {
  isSupported: boolean;
  isSecureContext: boolean;
  isApiAvailable: boolean;
  isUVPAAAvailable: boolean;//User Verifying Platform Authenticator Available
  isConditionalMediationAvailable: boolean;
  isIOSFallback?: boolean;
  error?: string;
}

interface ParsedAuthData {
  aaguid: Uint8Array;
  credentialId: Uint8Array;
  publicKey: Map<number, unknown>;
}

interface SignResult {
  signature: Uint8Array;
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  rawId: Uint8Array;
}

interface RegisterResult {
  success: boolean;
  credential?: {
    id: string;
    rawId: number[];
    type: string;
    publicKey: Map<number, unknown> | null;
    masterSeed: Uint8Array;
  };
  error?: string;
}

interface LoginResult {
  success: boolean;
  credential?: {
    id: string;
    rawId: number[];
    type: string;
    userHandle: string | null;
    masterSeed: Uint8Array | null;
    publicKey: Map<number, Uint8Array> | null;
  };
  error?: string;
}

class PasskeyService {
  static #supportCache: boolean | null = null

  static clearSupportCache(): void {
    this.#supportCache = null
  }

  static _parseAuthData(authData: Uint8Array): ParsedAuthData | null {
    try {
      DbgLog.log('🔍 Parsing authData. Total length:', authData.length, 'bytes');

      if (!(authData instanceof Uint8Array)) {
        authData = new Uint8Array(authData);
      }

      let offset = 37; // rpIdHash (32) + flags (1) + signCount (4)
      DbgLog.log('📍 Initial offset:', offset);

      if (authData.length < offset) {
        console.error('❌ authData is too short to parse AAGUID');
        return null;
      }

      const aaguid = authData.slice(offset, offset + 16);
      offset += 16;
      DbgLog.log('📍 AAGUID parsed. offset:', offset);

      if (authData.length < offset + 2) {
        console.error('❌ authData is too short to read credentialIdLength');
        return null;
      }

      const credentialIdLength = (new DataView(authData.buffer, authData.byteOffset, authData.byteLength)).getUint16(offset, false);
      offset += 2;
      DbgLog.log('📍 Credential ID length:', credentialIdLength, ', offset:', offset);

      if (credentialIdLength < 0 || credentialIdLength > 1024) {
        console.error('❌ Unexpected Credential ID length:', credentialIdLength);
        return null;
      }

      if (authData.length < offset + credentialIdLength) {
        console.error('❌ authData is too short to read full credentialId');
        console.error('   Need:', offset + credentialIdLength, 'bytes. Actual:', authData.length, 'bytes');
        return null;
      }

      const credentialId = authData.slice(offset, offset + credentialIdLength);
      offset += credentialIdLength;
      DbgLog.log('📍 Credential ID parsed. offset:', offset);

      if (authData.length <= offset) {
        console.error('❌ authData has no remaining bytes to parse Public Key');
        console.error('   offset:', offset, ', authData.length:', authData.length);
        return null;
      }

      const publicKeyBytes = authData.slice(offset);
      DbgLog.log('📍 Public Key CBOR byte length:', publicKeyBytes.length, 'bytes');
      DbgLog.log('📍 Public Key CBOR first 20 bytes:', Array.from(publicKeyBytes.slice(0, 20)));

      if (publicKeyBytes.length === 0) {
        console.error('❌ Public Key CBOR is empty');
        return null;
      }

      const publicKey = decode(new Uint8Array(publicKeyBytes));
      DbgLog.log('✅ Public Key parsed');
      DbgLog.log('📊 Public Key type:', publicKey instanceof Map ? 'Map' : typeof publicKey);

      return { aaguid, credentialId, publicKey };
    } catch (e) {
      console.error('❌ Failed to parse authData:', e);
      console.error('   Details:', (e as Error).message);
      console.error('   authData length:', authData?.length);
      return null;
    }
  }

  /**
   * Triggers a biometric (Face ID / fingerprint) verification via WebAuthn
   * without using the result for signing. Used as a security gate before
   * EOA transactions.
   */
  static async verifyIdentity(credentialId: string): Promise<boolean> {
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      let credentialIdBuffer: ArrayBuffer
      let base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      credentialIdBuffer = bytes.buffer as ArrayBuffer

      await navigator.credentials.get({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          allowCredentials: [{ id: credentialIdBuffer, type: 'public-key' }]
        }
      })

      return true
    } catch (error) {
      console.error('Biometric verification failed:', error)
      return false
    }
  }

  static async signChallenge(credentialId: string | number[] | ArrayBuffer | Uint8Array | DataView, challengeHash: Uint8Array): Promise<SignResult> {
    try {
      let credentialIdBuffer: ArrayBuffer;
      if (typeof credentialId === 'string') {
        try {
          let base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          credentialIdBuffer = bytes.buffer as ArrayBuffer;
        } catch {
          try {
            let base64 = credentialId;
            while (base64.length % 4) {
              base64 += '=';
            }
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            credentialIdBuffer = bytes.buffer as ArrayBuffer;
          } catch (e2) {
            throw new Error(`Failed to decode credentialId string: ${(e2 as Error).message}`);
          }
        }
      } else if (Array.isArray(credentialId)) {
        credentialIdBuffer = new Uint8Array(credentialId).buffer as ArrayBuffer;
      } else if (credentialId instanceof ArrayBuffer) {
        credentialIdBuffer = credentialId;
      } else if (credentialId instanceof Uint8Array) {
        credentialIdBuffer = credentialId.buffer as ArrayBuffer;
      } else if (credentialId instanceof DataView) {
        credentialIdBuffer = credentialId.buffer as ArrayBuffer;
      } else {
        throw new Error(`Invalid credentialId type: ${typeof credentialId}. Expected string, array, ArrayBuffer, or ArrayBufferView.`);
      }

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeHash.buffer as ArrayBuffer,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialIdBuffer,
          type: 'public-key'
        }]
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      const response = assertion.response as AuthenticatorAssertionResponse;

      return {
        signature: new Uint8Array(response.signature),
        authenticatorData: new Uint8Array(response.authenticatorData),
        clientDataJSON: new Uint8Array(response.clientDataJSON),
        rawId: new Uint8Array(assertion.rawId)
      }
    } catch (error) {
      console.error('EIP-7951 Signing failed:', error)
      throw error
    }
  }

  static async isSupported(): Promise<boolean> {
    DbgLog.log('🔍 Checking Passkey support...')

    if (this.#supportCache !== null) {
      DbgLog.log('📦 Using cached result:', this.#supportCache)
      return this.#supportCache
    }

    DbgLog.log('🔎 Checking required APIs...')
    if (!window.PublicKeyCredential) {
      console.warn('❌ PublicKeyCredential API is not available')
      this.#supportCache = false
      return false
    }

    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      console.warn('❌ isUserVerifyingPlatformAuthenticatorAvailable() is not available')
      this.#supportCache = false
      return false
    }

    const PKC = PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> }

    DbgLog.log('✅ Required APIs are present. Running capability checks...')
    DbgLog.log('📡 Calling APIs to detect capability...')

    const checks: Promise<boolean>[] = [PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()]
    if (PKC.isConditionalMediationAvailable) {
      checks.push(PKC.isConditionalMediationAvailable())
    }

    const results = await Promise.allSettled(checks)
    let isUVPAAAvailable = results[0].status === 'fulfilled' ? results[0].value : false
    const canConditionalMediate = results[1]?.status === 'fulfilled' ? results[1].value : false

    if (results[0].status === 'rejected') {
      console.error('💥 UVPAA check failed:', results[0].reason)
    }

    if (!isUVPAAAvailable && isIOSWithPasscodeCapable()) {
      DbgLog.log('📱 iOS 16+ fallback: device passcode can be used for passkey')
      isUVPAAAvailable = true
    }

    DbgLog.log('📊 Results:', {
      isUVPAAAvailable,
      isConditionalMediationAvailable: canConditionalMediate
    })

    this.#supportCache = isUVPAAAvailable
    DbgLog.log('🎯 Final support:', this.#supportCache)
    return this.#supportCache
  }

  static async getDeterministicSeed(credentialId: BufferSource): Promise<null> {
    try {
      const encoder = new TextEncoder()
      const message = encoder.encode("Wallet-Seed-Generation-v1")
      const challengeBuffer = await crypto.subtle.digest('SHA-256', message)

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuffer,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialId,
          type: 'public-key'
        }]
      }

      await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      })

      return null;
    } catch (error) {
      console.error('Failed to get deterministic seed:', error)
      throw error
    }
  }

  static async register(username: string, existingSeed: Uint8Array | null = null): Promise<RegisterResult> {
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      DbgLog.log("existingSeed:", existingSeed);
      let masterSeed: Uint8Array;
      if (existingSeed) {
        if (existingSeed.length !== 32) {
            throw new Error("Invalid existing seed length, expected 32 bytes");
        }
        masterSeed = existingSeed;
      } else {
        masterSeed = new Uint8Array(32)
        crypto.getRandomValues(masterSeed)
        DbgLog.log("masterSeed:", masterSeed);
      }

      const encoder = new TextEncoder()
      const maxUsernameBytes = 64 - 32 // 32 bytes for seed
      let usernameToUse = username
      let usernameBytes = encoder.encode(usernameToUse)
      if (usernameBytes.length > maxUsernameBytes) {
        while (usernameBytes.length > maxUsernameBytes && usernameToUse.length > 0) {
          usernameToUse = usernameToUse.slice(0, -1)
          usernameBytes = encoder.encode(usernameToUse)
        }
      }

      const userId = new Uint8Array(32 + usernameBytes.length)
      userId.set(masterSeed, 0)
      userId.set(usernameBytes, 32)

      // Configure options for creating a new Passkey credential
      // This includes the challenge, relying party info, user info, and authenticator requirements
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        // Relying Party: The application creating the credential
        rp: {
          name: "Ring Wallet",
          id: window.location.hostname
        },
        // User: The user account associated with the credential
        user: {
          id: userId,
          name: usernameToUse,
          displayName: usernameToUse
        },
        // Parameters: Supported cryptographic algorithms
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        timeout: 60000,
        attestation: "direct",
        // Authenticator Selection: Criteria for the authenticator
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Restrict to platform authenticators (e.g., FaceID, TouchID)
          requireResidentKey: true, // Require a client-side discoverable credential (resident key)
          userVerification: "required" // Require user verification (biometrics or PIN) for every operation
        }
      }

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      let publicKey: Map<number, unknown> | null = null;
      try {
        DbgLog.log('🔍 Parsing attestationObject...');
        const response = credential.response as AuthenticatorAttestationResponse;
        const attestationObject = new Uint8Array(response.attestationObject);
        DbgLog.log('📊 attestationObject length:', attestationObject.length, 'bytes');

        const decodedAttestation = decode(attestationObject) as { authData: Uint8Array | ArrayBuffer };
        DbgLog.log('✅ attestationObject decoded');
        DbgLog.log('📊 decodedAttestation keys:', Object.keys(decodedAttestation));

        const authData = decodedAttestation.authData;
        DbgLog.log('📊 authData type:', authData instanceof Uint8Array ? 'Uint8Array' : authData instanceof ArrayBuffer ? 'ArrayBuffer' : typeof authData);
        DbgLog.log('📊 authData length:', (authData as Uint8Array)?.length || (authData as ArrayBuffer)?.byteLength || 'unknown');

        let authDataArray: Uint8Array;
        if (authData instanceof ArrayBuffer) {
          authDataArray = new Uint8Array(authData);
        } else if (!(authData instanceof Uint8Array)) {
          authDataArray = new Uint8Array(authData as ArrayBuffer);
        } else {
          authDataArray = authData;
        }

        const parsedData = PasskeyService._parseAuthData(authDataArray);
        publicKey = parsedData ? parsedData.publicKey : null;

        if (publicKey) {
          const keyData = CharUtils.coseKeyToStorage(publicKey as Map<number, Uint8Array>);
          if (keyData) {
            const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(credential.rawId));
            if (credentialIdBase64) {
              safeSetItem(`new_wallet_pk_${credentialIdBase64}`, JSON.stringify(keyData));
              DbgLog.log('💾 EIP-7951 Public Key saved with key:', `new_wallet_pk_${credentialIdBase64}`);
            } else {
              console.warn('⚠️ Failed to convert credential.rawId to base64');
            }
          } else {
            console.warn('⚠️ Failed to convert publicKey to storage format');
          }
        }
      } catch (e) {
        console.warn('Failed to extract public key:', e);
      }

      DbgLog.log("publicKey:", publicKey);
      DbgLog.log("credential.id:", credential.id);
      DbgLog.log("masterSeed:", masterSeed);
      return {
        success: true,
        credential: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          publicKey: publicKey,
          masterSeed: masterSeed
        }
      }
    } catch (error) {
      console.error('Passkey registration failed:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  static async login(isConditional = false): Promise<LoginResult> {
    try {
      const challenge = new Uint8Array(32)//must random
      crypto.getRandomValues(challenge)

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 30000,
        userVerification: "required",
        rpId: window.location.hostname
      }

      const credential = await navigator.credentials.get({//
        publicKey: publicKeyCredentialRequestOptions,
        mediation: isConditional ? "conditional" : "optional"
      }) as PublicKeyCredential;

      let username: string | null = null;
      let masterSeed: Uint8Array | null = null;
      let publicKey: Map<number, Uint8Array> | null = null;

      try {
        DbgLog.log("[after login]credential:", credential);
        const credentialIdBase64 = CharUtils.uint8ArrayToBase64(new Uint8Array(credential.rawId));
        const storageKey = credentialIdBase64 ? `new_wallet_pk_${credentialIdBase64}` : null;

        if (storageKey) {
          DbgLog.log('🔍 Attempting to read Public Key from localStorage');
          DbgLog.log('   - credential.rawId (base64):', credentialIdBase64!.substring(0, 20) + '...');
          DbgLog.log('   - storage key:', storageKey);

          let storedKey = safeGetItem(storageKey);

          if (!storedKey && credential.id) {
            DbgLog.log('   - Trying credential.id (legacy format compatibility)');
            const oldStorageKey = `new_wallet_pk_${credential.id}`;
            storedKey = safeGetItem(oldStorageKey);
            if (storedKey) {
              DbgLog.log('   - ✅ Found legacy-format data. Key:', oldStorageKey);
            }
          }

          if (storedKey) {
            const keyData = JSON.parse(storedKey);
            DbgLog.log('   - ✅ Public Key data found');

            publicKey = CharUtils.coseKeyFromStorage(keyData);
            if (publicKey) {
              DbgLog.log('🔑 EIP-7951 Public Key retrieved from storage');
            } else {
              console.warn('⚠️ Failed to restore Public Key from storage data');
            }
          } else {
            console.warn('⚠️ No public key found in storage for credential');
            const allKeys = safeKeys();
            const relatedKeys = allKeys.filter(key => key.startsWith('new_wallet_pk_'));
            DbgLog.log('📋 Related keys in localStorage:', relatedKeys);
            if (relatedKeys.length > 0) {
              DbgLog.log('💡 Hint: other keys may be legacy-format data. Please re-register your 7951 wallet.');
            } else {
              DbgLog.log('💡 Hint: no Public Key data found in localStorage.');
              DbgLog.log('   Please verify:');
              DbgLog.log('   1. You completed registration via "Register 7951 Wallet"');
              DbgLog.log('   2. You saw the log "💾 EIP-7951 Public Key saved" during registration');
              DbgLog.log('   3. You are signing in on the same device');
            }
          }
        } else {
          console.warn('⚠️ Unable to use credential.rawId');
        }
      } catch (e) {
        console.warn('Failed to retrieve public key for EIP-7951:', e);
        console.error('Details:', e);
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      if (response.userHandle) {
        try {
          const userHandle = new Uint8Array(response.userHandle)

          if (userHandle.length >= 32) {
            masterSeed = userHandle.slice(0, 32)

            if (userHandle.length > 32) {
              const usernameBytes = userHandle.slice(32)
              const decoder = new TextDecoder('utf-8')
              username = decoder.decode(usernameBytes)

          DbgLog.log('🔓 Parsed userHandle:', {
                hasSeed: true,
                username: username
              })
            }
          } else {
            const decoder = new TextDecoder('utf-8')
            username = decoder.decode(userHandle)
          }

          if (username && /[\x00-\x08\x0E-\x1F\x7F]/.test(username)) {
             console.warn('UserHandle contains control characters, ignoring:', username)
             username = null
          }
        } catch (e) {
          console.warn('Failed to decode userHandle:', e)
        }
      }

      return {
        success: true,
        credential: {
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          userHandle: username,
          masterSeed: masterSeed,
          publicKey: publicKey
        }
      }
    } catch (error) {
      if (isConditional) {
        DbgLog.log('Passkey conditional UI check completed or skipped')
      } else {
        console.error('Passkey authentication failed:', error)
      }

      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  static async checkAvailability(): Promise<AvailabilityResult> {
    DbgLog.log('🔍 Checking Passkey availability...')
    try {
      const isSecureContext = window.isSecureContext
      const isApiAvailable = !!(window.PublicKeyCredential &&
                               PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)

      let isUVPAAAvailable = false
      let isConditionalMediationAvailable = false

      if (isApiAvailable) {
        const PKC = PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> };
        const results = await Promise.allSettled([
          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
          PKC.isConditionalMediationAvailable ? PKC.isConditionalMediationAvailable() : Promise.resolve(false)
        ])
        DbgLog.log('📊 results:', results);
        if (results[0].status === 'fulfilled') {
          isUVPAAAvailable = results[0].value
        } else {
          console.error('UVPAA check failed:', results[0].reason)
        }
        if (results[1].status === 'fulfilled') {
          isConditionalMediationAvailable = results[1].value
        } else {
          console.warn('Conditional mediation check failed (non-critical):', results[1].reason)
        }
      }

      let isIOSFallback = false
      if (!isUVPAAAvailable && isApiAvailable && isIOSWithPasscodeCapable()) {
        DbgLog.log('📱 iOS 16+: UVPAA=false but passcode can be used for passkey; enabling fallback')
        isUVPAAAvailable = true
        isIOSFallback = true
      }

      const isSupported = isApiAvailable && isUVPAAAvailable

      DbgLog.log('📊 Availability result:', {
        isSecureContext,
        isApiAvailable,
        isUVPAAAvailable,
        isSupported,
        isConditionalMediationAvailable,
        isIOSFallback
      })

      return {
        isSupported,
        isSecureContext,
        isApiAvailable,
        isUVPAAAvailable,
        isConditionalMediationAvailable,
        isIOSFallback
      }
    } catch (error) {
      console.error('💥 Passkey availability check failed:', error)
      return {
        isSupported: false,
        isSecureContext: window.isSecureContext,
        isApiAvailable: false,
        isUVPAAAvailable: false,
        isConditionalMediationAvailable: false,
        error: (error as Error).message
      }
    }
  }
}

export default PasskeyService
