import { render } from "preact";
import App from "./app/routes/index.lyra.tsx";
import { mount } from "@lyra-dev/runtime";

const root = document.getElementById("app")!;
render(<App />, root);
mount(root);
