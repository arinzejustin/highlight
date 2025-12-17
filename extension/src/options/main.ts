import OptionsApp from "./OptionsApp.svelte";
import "../styles/global.css";
import { mount } from "svelte";

const app = mount(OptionsApp, {
  target: document.getElementById("app")!,
});

export default app;
