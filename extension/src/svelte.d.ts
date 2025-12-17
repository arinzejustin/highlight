declare module "*.svelte" {
  import type { ComponentConstructorOptions, SvelteComponent } from "svelte";

  interface ComponentProps {
    [key: string]: any;
  }

  const component: new (
    options: ComponentConstructorOptions<ComponentProps>,
  ) => SvelteComponent;
  export default component;
}
