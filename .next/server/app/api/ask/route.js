/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/ask/route";
exports.ids = ["app/api/ask/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fask%2Froute&page=%2Fapi%2Fask%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fask%2Froute.ts&appDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fask%2Froute&page=%2Fapi%2Fask%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fask%2Froute.ts&appDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_alex_WebstormProjects_personal_rag_agent_app_api_ask_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/ask/route.ts */ \"(rsc)/./app/api/ask/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/ask/route\",\n        pathname: \"/api/ask\",\n        filename: \"route\",\n        bundlePath: \"app/api/ask/route\"\n    },\n    resolvedPagePath: \"/Users/alex/WebstormProjects/personal-rag-agent/app/api/ask/route.ts\",\n    nextConfigOutput,\n    userland: _Users_alex_WebstormProjects_personal_rag_agent_app_api_ask_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZhc2slMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmFzayUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmFzayUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFsZXglMkZXZWJzdG9ybVByb2plY3RzJTJGcGVyc29uYWwtcmFnLWFnZW50JTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmFsZXglMkZXZWJzdG9ybVByb2plY3RzJTJGcGVyc29uYWwtcmFnLWFnZW50JmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUNvQjtBQUNqRztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vPzczN2EiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbGV4L1dlYnN0b3JtUHJvamVjdHMvcGVyc29uYWwtcmFnLWFnZW50L2FwcC9hcGkvYXNrL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9hc2svcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9hc2tcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2Fzay9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9hbGV4L1dlYnN0b3JtUHJvamVjdHMvcGVyc29uYWwtcmFnLWFnZW50L2FwcC9hcGkvYXNrL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fask%2Froute&page=%2Fapi%2Fask%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fask%2Froute.ts&appDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./app/api/ask/route.ts":
/*!******************************!*\
  !*** ./app/api/ask/route.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\n\nasync function POST(request) {\n    try {\n        // Создаем Supabase клиент с service role для сервера\n        const supabaseUrl = \"https://zqharntcylmxxdcvbtqi.supabase.co\";\n        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n        if (!supabaseUrl || !supabaseServiceKey) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Ошибка конфигурации сервера'\n            }, {\n                status: 500\n            });\n        }\n        const supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(supabaseUrl, supabaseServiceKey, {\n            auth: {\n                autoRefreshToken: false,\n                persistSession: false\n            }\n        });\n        // Получаем токен из заголовка Authorization\n        const authHeader = request.headers.get('authorization');\n        if (!authHeader) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Не авторизован - отсутствует токен'\n            }, {\n                status: 401\n            });\n        }\n        const token = authHeader.replace('Bearer ', '');\n        const { data: { user }, error: authError } = await supabase.auth.getUser(token);\n        if (authError || !user) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Не авторизован'\n            }, {\n                status: 401\n            });\n        }\n        const body = await request.json();\n        const { question } = body;\n        if (!question || typeof question !== 'string' || question.trim().length === 0) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Вопрос не предоставлен или пустой'\n            }, {\n                status: 400\n            });\n        }\n        if (question.length > 1000) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Вопрос слишком длинный (максимум 1000 символов)'\n            }, {\n                status: 400\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            answer: 'Функция чата будет реализована на следующем этапе (Prompt B). Сейчас это заглушка.',\n            question: question\n        });\n    } catch (error) {\n        console.error('Ask error:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: `Внутренняя ошибка сервера: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2Fzay9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBd0Q7QUFDSDtBQUU5QyxlQUFlRSxLQUFLQyxPQUFvQjtJQUMzQyxJQUFJO1FBQ0EscURBQXFEO1FBQ3JELE1BQU1DLGNBQWNDLDBDQUFvQztRQUN4RCxNQUFNRyxxQkFBcUJILFFBQVFDLEdBQUcsQ0FBQ0cseUJBQXlCO1FBRWhFLElBQUksQ0FBQ0wsZUFBZSxDQUFDSSxvQkFBb0I7WUFDckMsT0FBT1IscURBQVlBLENBQUNVLElBQUksQ0FDcEI7Z0JBQUVDLE9BQU87WUFBOEIsR0FDdkM7Z0JBQUVDLFFBQVE7WUFBSTtRQUV0QjtRQUVBLE1BQU1DLFdBQVdaLG1FQUFZQSxDQUFDRyxhQUFhSSxvQkFBb0I7WUFDM0RNLE1BQU07Z0JBQ0ZDLGtCQUFrQjtnQkFDbEJDLGdCQUFnQjtZQUNwQjtRQUNKO1FBRUEsNENBQTRDO1FBQzVDLE1BQU1DLGFBQWFkLFFBQVFlLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDO1FBQ3ZDLElBQUksQ0FBQ0YsWUFBWTtZQUNiLE9BQU9qQixxREFBWUEsQ0FBQ1UsSUFBSSxDQUNwQjtnQkFBRUMsT0FBTztZQUFxQyxHQUM5QztnQkFBRUMsUUFBUTtZQUFJO1FBRXRCO1FBRUEsTUFBTVEsUUFBUUgsV0FBV0ksT0FBTyxDQUFDLFdBQVc7UUFDNUMsTUFBTSxFQUFFQyxNQUFNLEVBQUVDLElBQUksRUFBRSxFQUFFWixPQUFPYSxTQUFTLEVBQUUsR0FBRyxNQUFNWCxTQUFTQyxJQUFJLENBQUNXLE9BQU8sQ0FBQ0w7UUFFekUsSUFBSUksYUFBYSxDQUFDRCxNQUFNO1lBQ3BCLE9BQU92QixxREFBWUEsQ0FBQ1UsSUFBSSxDQUNwQjtnQkFBRUMsT0FBTztZQUFpQixHQUMxQjtnQkFBRUMsUUFBUTtZQUFJO1FBRXRCO1FBRUEsTUFBTWMsT0FBTyxNQUFNdkIsUUFBUU8sSUFBSTtRQUMvQixNQUFNLEVBQUVpQixRQUFRLEVBQUUsR0FBR0Q7UUFFckIsSUFBSSxDQUFDQyxZQUFZLE9BQU9BLGFBQWEsWUFBWUEsU0FBU0MsSUFBSSxHQUFHQyxNQUFNLEtBQUssR0FBRztZQUMzRSxPQUFPN0IscURBQVlBLENBQUNVLElBQUksQ0FDcEI7Z0JBQUVDLE9BQU87WUFBb0MsR0FDN0M7Z0JBQUVDLFFBQVE7WUFBSTtRQUV0QjtRQUVBLElBQUllLFNBQVNFLE1BQU0sR0FBRyxNQUFNO1lBQ3hCLE9BQU83QixxREFBWUEsQ0FBQ1UsSUFBSSxDQUNwQjtnQkFBRUMsT0FBTztZQUFrRCxHQUMzRDtnQkFBRUMsUUFBUTtZQUFJO1FBRXRCO1FBRUEsT0FBT1oscURBQVlBLENBQUNVLElBQUksQ0FBQztZQUNyQm9CLFFBQVE7WUFDUkgsVUFBVUE7UUFDZDtJQUVKLEVBQUUsT0FBT2hCLE9BQU87UUFDWm9CLFFBQVFwQixLQUFLLENBQUMsY0FBY0E7UUFDNUIsT0FBT1gscURBQVlBLENBQUNVLElBQUksQ0FDcEI7WUFBRUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFQSxpQkFBaUJxQixRQUFRckIsTUFBTXNCLE9BQU8sR0FBRyxzQkFBc0I7UUFBQyxHQUN2RztZQUFFckIsUUFBUTtRQUFJO0lBRXRCO0FBQ0oiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9hcHAvYXBpL2Fzay9yb3V0ZS50cz9iOWVlIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXF1ZXN0LCBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vINCh0L7Qt9C00LDQtdC8IFN1cGFiYXNlINC60LvQuNC10L3RgiDRgSBzZXJ2aWNlIHJvbGUg0LTQu9GPINGB0LXRgNCy0LXRgNCwXG4gICAgICAgIGNvbnN0IHN1cGFiYXNlVXJsID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMO1xuICAgICAgICBjb25zdCBzdXBhYmFzZVNlcnZpY2VLZXkgPSBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZO1xuXG4gICAgICAgIGlmICghc3VwYWJhc2VVcmwgfHwgIXN1cGFiYXNlU2VydmljZUtleSkge1xuICAgICAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICAgICAgICAgIHsgZXJyb3I6ICfQntGI0LjQsdC60LAg0LrQvtC90YTQuNCz0YPRgNCw0YbQuNC4INGB0LXRgNCy0LXRgNCwJyB9LFxuICAgICAgICAgICAgICAgIHsgc3RhdHVzOiA1MDAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlQ2xpZW50KHN1cGFiYXNlVXJsLCBzdXBhYmFzZVNlcnZpY2VLZXksIHtcbiAgICAgICAgICAgIGF1dGg6IHtcbiAgICAgICAgICAgICAgICBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwZXJzaXN0U2Vzc2lvbjogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyDQn9C+0LvRg9GH0LDQtdC8INGC0L7QutC10L0g0LjQtyDQt9Cw0LPQvtC70L7QstC60LAgQXV0aG9yaXphdGlvblxuICAgICAgICBjb25zdCBhdXRoSGVhZGVyID0gcmVxdWVzdC5oZWFkZXJzLmdldCgnYXV0aG9yaXphdGlvbicpO1xuICAgICAgICBpZiAoIWF1dGhIZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgICAgICAgICB7IGVycm9yOiAn0J3QtSDQsNCy0YLQvtGA0LjQt9C+0LLQsNC9IC0g0L7RgtGB0YPRgtGB0YLQstGD0LXRgiDRgtC+0LrQtdC9JyB9LFxuICAgICAgICAgICAgICAgIHsgc3RhdHVzOiA0MDEgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5yZXBsYWNlKCdCZWFyZXIgJywgJycpO1xuICAgICAgICBjb25zdCB7IGRhdGE6IHsgdXNlciB9LCBlcnJvcjogYXV0aEVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIodG9rZW4pO1xuXG4gICAgICAgIGlmIChhdXRoRXJyb3IgfHwgIXVzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgICAgICAgICB7IGVycm9yOiAn0J3QtSDQsNCy0YLQvtGA0LjQt9C+0LLQsNC9JyB9LFxuICAgICAgICAgICAgICAgIHsgc3RhdHVzOiA0MDEgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcbiAgICAgICAgY29uc3QgeyBxdWVzdGlvbiB9ID0gYm9keTtcblxuICAgICAgICBpZiAoIXF1ZXN0aW9uIHx8IHR5cGVvZiBxdWVzdGlvbiAhPT0gJ3N0cmluZycgfHwgcXVlc3Rpb24udHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICAgICAgICAgIHsgZXJyb3I6ICfQktC+0L/RgNC+0YEg0L3QtSDQv9GA0LXQtNC+0YHRgtCw0LLQu9C10L0g0LjQu9C4INC/0YPRgdGC0L7QuScgfSxcbiAgICAgICAgICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVlc3Rpb24ubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICAgICAgICAgIHsgZXJyb3I6ICfQktC+0L/RgNC+0YEg0YHQu9C40YjQutC+0Lwg0LTQu9C40L3QvdGL0LkgKNC80LDQutGB0LjQvNGD0LwgMTAwMCDRgdC40LzQstC+0LvQvtCyKScgfSxcbiAgICAgICAgICAgICAgICB7IHN0YXR1czogNDAwIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgICAgICAgYW5zd2VyOiAn0KTRg9C90LrRhtC40Y8g0YfQsNGC0LAg0LHRg9C00LXRgiDRgNC10LDQu9C40LfQvtCy0LDQvdCwINC90LAg0YHQu9C10LTRg9GO0YnQtdC8INGN0YLQsNC/0LUgKFByb21wdCBCKS4g0KHQtdC50YfQsNGBINGN0YLQviDQt9Cw0LPQu9GD0YjQutCwLicsXG4gICAgICAgICAgICBxdWVzdGlvbjogcXVlc3Rpb24sXG4gICAgICAgIH0pO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignQXNrIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICAgICAgeyBlcnJvcjogYNCS0L3Rg9GC0YDQtdC90L3Rj9GPINC+0YjQuNCx0LrQsCDRgdC10YDQstC10YDQsDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICfQndC10LjQt9Cy0LXRgdGC0L3QsNGPINC+0YjQuNCx0LrQsCd9YCB9LFxuICAgICAgICAgICAgeyBzdGF0dXM6IDUwMCB9XG4gICAgICAgICk7XG4gICAgfVxufSJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJjcmVhdGVDbGllbnQiLCJQT1NUIiwicmVxdWVzdCIsInN1cGFiYXNlVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTCIsInN1cGFiYXNlU2VydmljZUtleSIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJqc29uIiwiZXJyb3IiLCJzdGF0dXMiLCJzdXBhYmFzZSIsImF1dGgiLCJhdXRvUmVmcmVzaFRva2VuIiwicGVyc2lzdFNlc3Npb24iLCJhdXRoSGVhZGVyIiwiaGVhZGVycyIsImdldCIsInRva2VuIiwicmVwbGFjZSIsImRhdGEiLCJ1c2VyIiwiYXV0aEVycm9yIiwiZ2V0VXNlciIsImJvZHkiLCJxdWVzdGlvbiIsInRyaW0iLCJsZW5ndGgiLCJhbnN3ZXIiLCJjb25zb2xlIiwiRXJyb3IiLCJtZXNzYWdlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/ask/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fask%2Froute&page=%2Fapi%2Fask%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fask%2Froute.ts&appDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Falex%2FWebstormProjects%2Fpersonal-rag-agent&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();