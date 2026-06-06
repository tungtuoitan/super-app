const path = require("path");

module.exports = {
    devServer: {
        hot: true,
        liveReload: true,
        host: "0.0.0.0",
        allowedHosts: "all",
        client: {
            // HMR WebSocket follows the host the page was loaded from,
            // so opening http://192.168.2.1:3000 on mobile works without changing this.
            webSocketURL: "auto://0.0.0.0:0/ws",
        },
    },
    webpack: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@/config": path.resolve(__dirname, "src/config"),
            "@/services": path.resolve(__dirname, "src/services"),
            "@/hooks": path.resolve(__dirname, "src/hooks"),
            "@/contexts": path.resolve(__dirname, "src/contexts"),
            "@/types": path.resolve(__dirname, "src/types"),
            "@/utils": path.resolve(__dirname, "src/utils"),
            "@/components": path.resolve(__dirname, "src/Components"),
            "@/Components": path.resolve(__dirname, "src/Components"),
            "@/shared": path.resolve(__dirname, "src/shared"),
            "@/lib": path.resolve(__dirname, "src/lib"),
            "@/features": path.resolve(__dirname, "src/features"),
            "@/pages": path.resolve(__dirname, "src/pages"),
            "@/store": path.resolve(__dirname, "src/store"),
            "@/styles": path.resolve(__dirname, "src/styles"),
            "@/shell": path.resolve(__dirname, "src/shell"),
        },
        configure: (webpackConfig, { env, paths }) => {
            // Fix source-map-loader issues with MUI
            if (env === "development") {
                webpackConfig.module.rules.forEach((rule) => {
                    if (rule.enforce === "pre" && rule.use) {
                        rule.use.forEach((useEntry) => {
                            if (useEntry.loader && useEntry.loader.includes("source-map-loader")) {
                                useEntry.exclude = [/node_modules\/@mui/, /node_modules\/@emotion/, /node_modules\/react-scripts/];
                            }
                        });
                    }
                });
            }

            // Ignore missing source maps warnings
            webpackConfig.ignoreWarnings = [
                function ignoreSourcemapsloaderWarnings(warning) {
                    return (
                        warning.module &&
                        warning.module.resource &&
                        warning.module.resource.includes("node_modules") &&
                        warning.details &&
                        warning.details.includes("source-map-loader")
                    );
                },
            ];

            return webpackConfig;
        },
    },
};
