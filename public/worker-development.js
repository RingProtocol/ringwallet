/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.ts":
/*!*************************!*\
  !*** ./worker/index.ts ***!
  \*************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n// To disable all Workbox logging during development, you can set self.__WB_DISABLE_DEV_LOGS to true\n// https://developer.chrome.com/docs/workbox/troubleshooting-and-logging/#turn-off-logging-in-development-builds-in-any-workflow\n// self.__WB_DISABLE_DEV_LOGS = true\n// listen to message event from window\nself.addEventListener(\"message\", (event)=>{\n// noop\n});\nself.addEventListener(\"push\", async (event)=>{\n    var _event_data, _event;\n    var _event_data_text;\n    // await demoIndexedDbWrite()\n    const data = JSON.parse((_event_data_text = (_event_data = event.data) === null || _event_data === void 0 ? void 0 : _event_data.text()) !== null && _event_data_text !== void 0 ? _event_data_text : '{ title: \"\" }');\n    (_event = event) === null || _event === void 0 ? void 0 : _event.waitUntil(self.registration.showNotification(data.title, {\n        body: data.message,\n        icon: \"/icons/android-chrome-192x192.png\"\n    }));\n});\nself.addEventListener(\"notificationclick\", (event)=>{\n    var _event, _event1;\n    (_event = event) === null || _event === void 0 ? void 0 : _event.notification.close();\n    (_event1 = event) === null || _event1 === void 0 ? void 0 : _event1.waitUntil(self.clients.matchAll({\n        type: \"window\",\n        includeUncontrolled: true\n    }).then(function(clientList) {\n        if (clientList.length > 0) {\n            let client = clientList[0];\n            for(let i = 0; i < clientList.length; i++){\n                if (clientList[i].focused) {\n                    client = clientList[i];\n                }\n            }\n            return client.focus();\n        }\n        return self.clients.openWindow(\"/\");\n    }));\n});\n\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevExports = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevExports) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports on update so we can compare the boundary\n                // signatures.\n                module.hot.dispose(function (data) {\n                    data.prevExports = currentExports;\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevExports !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevExports, currentExports)) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevExports !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXgudHMiLCJtYXBwaW5ncyI6IjtBQUlBLG9HQUFvRztBQUNwRyxnSUFBZ0k7QUFDaEksb0NBQW9DO0FBRXBDLHNDQUFzQztBQUN0Q0EsS0FBS0MsZ0JBQWdCLENBQUMsV0FBVyxDQUFDQztBQUNoQyxPQUFPO0FBQ1Q7QUFFQUYsS0FBS0MsZ0JBQWdCLENBQUMsUUFBUSxPQUFPQztRQUVYQSxhQUN4QkE7UUFEd0JBO0lBRHhCLDZCQUE2QjtJQUM3QixNQUFNQyxPQUFPQyxLQUFLQyxLQUFLLENBQUNILENBQUFBLG9CQUFBQSxjQUFBQSxNQUFNQyxJQUFJLGNBQVZELGtDQUFBQSxZQUFZSSxJQUFJLGdCQUFoQkosOEJBQUFBLG1CQUFzQjtLQUM5Q0EsU0FBQUEsbUJBQUFBLDZCQUFBQSxPQUFPSyxTQUFTLENBQ2RQLEtBQUtRLFlBQVksQ0FBQ0MsZ0JBQWdCLENBQUNOLEtBQUtPLEtBQUssRUFBRTtRQUM3Q0MsTUFBTVIsS0FBS1MsT0FBTztRQUNsQkMsTUFBTTtJQUNSO0FBRUo7QUFFQWIsS0FBS0MsZ0JBQWdCLENBQUMscUJBQXFCLENBQUNDO1FBQzFDQSxRQUNBQTtLQURBQSxTQUFBQSxtQkFBQUEsNkJBQUFBLE9BQU9ZLFlBQVksQ0FBQ0MsS0FBSztLQUN6QmIsVUFBQUEsbUJBQUFBLDhCQUFBQSxRQUFPSyxTQUFTLENBQ2RQLEtBQUtnQixPQUFPLENBQ1RDLFFBQVEsQ0FBQztRQUFFQyxNQUFNO1FBQVVDLHFCQUFxQjtJQUFLLEdBQ3JEQyxJQUFJLENBQUMsU0FBVUMsVUFBVTtRQUN4QixJQUFJQSxXQUFXQyxNQUFNLEdBQUcsR0FBRztZQUN6QixJQUFJQyxTQUFTRixVQUFVLENBQUMsRUFBRTtZQUMxQixJQUFLLElBQUlHLElBQUksR0FBR0EsSUFBSUgsV0FBV0MsTUFBTSxFQUFFRSxJQUFLO2dCQUMxQyxJQUFJSCxVQUFVLENBQUNHLEVBQUUsQ0FBQ0MsT0FBTyxFQUFFO29CQUN6QkYsU0FBU0YsVUFBVSxDQUFDRyxFQUFFO2dCQUN4QjtZQUNGO1lBQ0EsT0FBT0QsT0FBT0csS0FBSztRQUNyQjtRQUNBLE9BQU8xQixLQUFLZ0IsT0FBTyxDQUFDVyxVQUFVLENBQUM7SUFDakM7QUFFTjtBQUFFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL3dvcmtlci9pbmRleC50cz9lY2JlIl0sInNvdXJjZXNDb250ZW50IjpbImRlY2xhcmUgY29uc3Qgc2VsZjogU2VydmljZVdvcmtlckdsb2JhbFNjb3BlXG5pbXBvcnQgeyB1dGlsIH0gZnJvbSAnLi4vc2hhcmVkL3dvcmtlci11dGlscydcbmltcG9ydCB7IFB3YU9uRGV2aWNlUGVyc2lzdGVudERCLCBkZW1vSW5kZXhlZERiV3JpdGUgfSBmcm9tICcuL2RiJ1xuXG4vLyBUbyBkaXNhYmxlIGFsbCBXb3JrYm94IGxvZ2dpbmcgZHVyaW5nIGRldmVsb3BtZW50LCB5b3UgY2FuIHNldCBzZWxmLl9fV0JfRElTQUJMRV9ERVZfTE9HUyB0byB0cnVlXG4vLyBodHRwczovL2RldmVsb3Blci5jaHJvbWUuY29tL2RvY3Mvd29ya2JveC90cm91Ymxlc2hvb3RpbmctYW5kLWxvZ2dpbmcvI3R1cm4tb2ZmLWxvZ2dpbmctaW4tZGV2ZWxvcG1lbnQtYnVpbGRzLWluLWFueS13b3JrZmxvd1xuLy8gc2VsZi5fX1dCX0RJU0FCTEVfREVWX0xPR1MgPSB0cnVlXG5cbi8vIGxpc3RlbiB0byBtZXNzYWdlIGV2ZW50IGZyb20gd2luZG93XG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZXZlbnQpID0+IHtcbiAgLy8gbm9vcFxufSlcblxuc2VsZi5hZGRFdmVudExpc3RlbmVyKCdwdXNoJywgYXN5bmMgKGV2ZW50KSA9PiB7XG4gIC8vIGF3YWl0IGRlbW9JbmRleGVkRGJXcml0ZSgpXG4gIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGE/LnRleHQoKSA/PyAneyB0aXRsZTogXCJcIiB9JylcbiAgZXZlbnQ/LndhaXRVbnRpbChcbiAgICBzZWxmLnJlZ2lzdHJhdGlvbi5zaG93Tm90aWZpY2F0aW9uKGRhdGEudGl0bGUsIHtcbiAgICAgIGJvZHk6IGRhdGEubWVzc2FnZSxcbiAgICAgIGljb246ICcvaWNvbnMvYW5kcm9pZC1jaHJvbWUtMTkyeDE5Mi5wbmcnLFxuICAgIH0pLFxuICApXG59KVxuXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ25vdGlmaWNhdGlvbmNsaWNrJywgKGV2ZW50KSA9PiB7XG4gIGV2ZW50Py5ub3RpZmljYXRpb24uY2xvc2UoKVxuICBldmVudD8ud2FpdFVudGlsKFxuICAgIHNlbGYuY2xpZW50c1xuICAgICAgLm1hdGNoQWxsKHsgdHlwZTogJ3dpbmRvdycsIGluY2x1ZGVVbmNvbnRyb2xsZWQ6IHRydWUgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChjbGllbnRMaXN0KSB7XG4gICAgICAgIGlmIChjbGllbnRMaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsZXQgY2xpZW50ID0gY2xpZW50TGlzdFswXVxuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2xpZW50TGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGNsaWVudExpc3RbaV0uZm9jdXNlZCkge1xuICAgICAgICAgICAgICBjbGllbnQgPSBjbGllbnRMaXN0W2ldXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjbGllbnQuZm9jdXMoKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZWxmLmNsaWVudHMub3BlbldpbmRvdygnLycpXG4gICAgICB9KSxcbiAgKVxufSlcbiJdLCJuYW1lcyI6WyJzZWxmIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50IiwiZGF0YSIsIkpTT04iLCJwYXJzZSIsInRleHQiLCJ3YWl0VW50aWwiLCJyZWdpc3RyYXRpb24iLCJzaG93Tm90aWZpY2F0aW9uIiwidGl0bGUiLCJib2R5IiwibWVzc2FnZSIsImljb24iLCJub3RpZmljYXRpb24iLCJjbG9zZSIsImNsaWVudHMiLCJtYXRjaEFsbCIsInR5cGUiLCJpbmNsdWRlVW5jb250cm9sbGVkIiwidGhlbiIsImNsaWVudExpc3QiLCJsZW5ndGgiLCJjbGllbnQiLCJpIiwiZm9jdXNlZCIsImZvY3VzIiwib3BlbldpbmRvdyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.ts");
/******/ 	
/******/ })()
;