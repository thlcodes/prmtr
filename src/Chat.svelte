<script>
    import { send, stream } from "./lib/chat";
    import { marked } from "marked";

    let context = $state("you are a calculator");
    let instruction = $state("1+2+3");
    let temperature = $state(50);
    let reply_length = $state(50);

    let replies = $state([]);

    let loading = $state(false);

    async function create() {
        const request = `
        Beantworte die folgende Frage ensprechend dem hier gegebenen Kontexts.
        ${reply_length <= 30 ? "Antworte kurz." : reply_length > 70 ? "Antworte sehr ausführlich." : ""}
        <context>
        ${context}
        </context>

        ${instruction}
      `;
        loading = true;
        replies = [...replies, null];
        setTimeout(() => {
            window.scrollTo({ top: 550, behavior: "smooth" });
        }, 500);
        const reply = "";
        let raw = "";
        await stream(request, temperature / 100, async (s) => {
            raw = raw + s;
            replies[replies.length - 1] = await marked.parse(raw);
        });
        loading = false;
        if (output) output.scrollLeft = 0;
    }

    let output;
</script>

<main>
    <section class="input">
        <div>
            <label for="">Kontext</label>
            <textarea
                class="g-textarea"
                placeholder="z.B. Hintergrundinformationen, Beispiele, Vorlagen"
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
                Erstellen
            </button>
        </div>
    </section>
    <section
        class="output"
        bind:this={output}
        class:centered={replies.length <= 1}
    >
        {#each replies.toReversed() as reply}
            <section class="g-card">
                {#if reply}
                    {@html reply}
                {:else}
                    <groupui-loading embedded></groupui-loading>
                {/if}
            </section>
        {/each}
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
        padding: 60px;
        gap: 24px;
        overflow-x: scroll;

        section {
            min-width: calc((100% - 24px) / 2);
            max-width: calc((100% - 24px) / 2);
        }
    }

    .output.centered {
        justify-content: center;
    }
</style>
