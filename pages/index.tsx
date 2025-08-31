import React from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

function Home(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <Head>
        <title>Página em Construção</title>
        <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <h1>Página em Construção</h1>
      </div>
    </div>
  );
}

export default Home;
