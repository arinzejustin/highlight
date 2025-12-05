import PopupApp from "./PopupApp.svelte";
import "../styles/global.css";
import { mount } from "svelte";

const app = mount(PopupApp, {
  target: document.getElementById("app")!,
});

export default app;
