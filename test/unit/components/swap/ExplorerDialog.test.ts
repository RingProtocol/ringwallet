import { describe, it, expect } from 'vitest'
import ExplorerDialog, {
  type ExplorerDialogProps,
} from '../../../../src/components/swap/ExplorerDialog'

describe('ExplorerDialog (structural)', () => {
  it('is exported as a function (React component)', () => {
    expect(typeof ExplorerDialog).toBe('function')
  })

  it('has the correct display name or function name', () => {
    expect(ExplorerDialog.name).toBe('ExplorerDialog')
  })

  it('ExplorerDialogProps type has url and onClose (compile-time check)', () => {
    const props: ExplorerDialogProps = {
      url: 'https://etherscan.io/tx/0xabc',
      onClose: () => {},
    }
    expect(props.url).toBe('https://etherscan.io/tx/0xabc')
    expect(typeof props.onClose).toBe('function')
  })
})
