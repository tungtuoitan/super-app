import { Main } from "./Main";

// Register all feature modules into the VSCode shell (side-effect import)
import "./shell/modules.config";
// Register all keyword navigator plugins
import "./shell/commandPallete/keywordNavigator.config";
import "./App.css";

/**
 * Root application component.
 *
 * This component serves as the main entry point for the application,
 * setting up the global providers and the main layout structure.
 *
 * @returns The main application component with all necessary providers
 */
export function App() {
    return (
        <div className="App overflow-hidden h-screen w-full m-0 p-0">
            <Main />
        </div>
    );
}
