import { Head } from "$fresh/runtime.ts";
import { type AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles.css" />
      </Head>
      <Component />
    </>
  );
}



