<script>
    import { send } from "./lib/chat";

    let context = $state("");
    let instruction = $state("");
    let temperature = $state(50);
    let reply_length = $state(50);

    let replies = $state([]);

    let loading = $state(false);

    async function create() {
        const request = `
        Beantworte die folgende Frage ensprechend dem hier gegebenen Kontexts.
        ${reply_length <= 30 ? "Antworte kurz." : ""}
        <context>
        ${context}
        </context>

        ${instruction}
      `;
        loading = true;
        replies = [...replies, await send(request, temperature / 100)];
        loading = false;
    }
</script>

<main>
    <section class="input">
        <div>
            <label for="">Kontext</label>
            <textarea
                class="g-textarea"
                placeholder="z.B. Verhalte dich wie ein Product Manager.."
                bind:value={context}
                rows="4"
            ></textarea>
        </div>
        <div>
            <label for="">Aufgabe</label><textarea
                class="g-textarea"
                bind:value={instruction}
                placeholder="z.B. Erstelle eine User Story für.."
                rows="4"
            ></textarea>
        </div>
        <div class="sliders">
            <div>
                <groupui-slider
                    value={temperature}
                    on:change={(e) => {
                        temperature = e.target.value;
                    }}
                ></groupui-slider>
                <legend><span>genau</span><span>kreativ</span></legend>
            </div>
            <div>
                <groupui-slider
                    value={reply_length}
                    on:change={(e) => {
                        reply_length = e.target.value;
                    }}
                ></groupui-slider>
                <legend><span>kurz</span><span>lang</span></legend>
            </div>
        </div>
        <div class="buttons">
            <button
                class="g-btn g-btn-primary"
                class:g-btn-disabled={loading}
                disabled={loading}
                on:click={create}
            >
                {#if loading}
                    <groupui-loading embedded inverted></groupui-loading>
                {:else}
                    Erstellen
                {/if}
            </button>
        </div>
    </section>
    <section class="output">
        {#if replies.length == 0}
            <section class="g-card empty">
                Du hast noch kein Ergebnis generieren lassen.
            </section>
        {:else}
            {#each replies.slice(-2).reverse() as reply}
                <section class="g-card">
                    {reply}
                </section>
            {/each}
        {/if}
    </section>
</main>

<style>
    :root {
        background-color: var(--groupui-vwgroup-ref-color-grey-100);
    }
    main {
        display: flex;
        flex-direction: column;
    }

    .input {
        padding: 72px 220px;
        background-color: white;
        display: grid;
        grid-template-columns: auto;
        grid-column-gap: 48px;
        grid-row-gap: 36px;
        width: 100%;

        > div {
            display: flex;
            flex-direction: column;

            label {
                font-weight: bold;
            }
        }

        .sliders {
            display: grid;
            grid-template-columns: auto auto;
            grid-column-gap: 120px;

            groupui-slider {
                margin-top: 24px;
            }

            legend {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
            }
        }

        .buttons {
            display: flex;
            align-items: flex-end;
        }
    }

    .output {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        justify-content: center;
        padding: 60px;
        gap: 24px;

        section {
            width: 636px;
        }

        section.empty {
            color: var(--groupui-vwgroup-ref-color-grey-600);
        }
    }
</style>
