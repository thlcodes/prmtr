<script>
    import { ask, stream } from "./lib/chat";
    import { marked } from "marked";
    import Sidebar from "./Sidebar.svelte";
    import { onMount } from "svelte";
    import AddIcon from "./assets/add.svg";
    import HideIcon from "./assets/hide.svg";

    /** @typedef {{content?: string, title?: string, hidden?: boolean}} Context */
    /** @type {Context[]} */
    let contexts = $state([]);
    let instruction = $state("");
    let temperature = $state(50);
    let reply_length = $state(50);

    let replies = $state([]);

    let loading = $state(false);

    onMount(() => {
        try {
            contexts = JSON.parse(localStorage.getItem("contexts") || "[]");
        } catch (e) {
            console.log("could not load contexts:", e);
        }
    });

    async function create() {
        const request = `
        Beantworte die folgende Frage ensprechend dem hier gegebenen Kontexts.
        Erähne nie den Kontext. Wenn der Kontext leer ist, beantworte die Frage ohne ihn.
        ${reply_length <= 30 ? "Antworte kurz." : reply_length > 70 ? "Antworte sehr ausführlich." : ""}
        <context>
        ${contexts
            .filter(($) => !$.hidden)
            .map(($) => $.content)
            .join("\n\n")}
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

    /**
     *
     * @param content {string}
     */
    async function deriveTitle(content) {
        const request = `Derive a concise title that fits the given context.
        <context>
        ${content}
        </context>
        Use at most 25 characters.
        Do not put the title in quotes or use ending punctuation.
        Use the language you find in the context.
        Do not include one of the following, already existing titles:
        ${contexts
            .filter(($) => !!$)
            .map(($) => $.title)
            .join("\n")}
        `;
        const title = await ask(request, 0.1);
        return title;
    }

    /**
     *
     * @param {number} idx
     */
    async function updateTitle(idx) {
        const context = contexts[idx];
        if (!context) return;
        contexts[idx].title = await deriveTitle(context.content);
    }

    /**
     *
     * @param {number} idx
     */
    function hideContext(idx) {
        const context = contexts[idx];
        if (!context) return;
        if ((context.content ?? "").trim() == "") {
            contexts = contexts.toSpliced(idx, 1);
            return;
        }
        contexts[idx].hidden = true;
        save();
    }

    /**
     *
     * @param {number} idx
     */
    function toggeContext(idx) {
        const context = contexts[idx];
        if (!context) return;
        contexts[idx].hidden = !contexts[idx].hidden;
        save();
    }

    function save() {
        console.log("saving", contexts);
        localStorage.setItem("contexts", JSON.stringify(contexts));
    }

    /**
     *
     * @param {number} idx
     */
    function del(idx) {
        contexts = contexts.toSpliced(idx, 1);
        save();
    }

    function reset() {
        instruction = "";
        temperature = 50;
        reply_length = 50;
        contexts = contexts.map(($) => ({ ...$, hidden: true }));
        save();
    }

    let output;
</script>

<main>
    <section class="sidebar">
        <Sidebar select={toggeContext} {del} {contexts} />
    </section>
    <section class="input">
        <div class="contexts">
            <groupui-headline heading="h3">Kontext</groupui-headline>
            <div class="inner">
                <div class="new">
                    <label for="">Neu</label>
                    <button
                        class="new_context"
                        on:click={() => {
                            contexts = [{}, ...contexts];
                        }}
                    >
                        <img src={AddIcon} alt="add" />
                    </button>
                </div>

                {#each contexts.filter(($) => !$.hidden) as context, idx}
                    {#if !context.hidden}
                        <div class="context">
                            <label for="">{context.title ?? "Neu"}</label>
                            <textarea
                                bind:value={contexts[idx].content}
                                on:change={async () => {
                                    await updateTitle(idx);
                                    save();
                                }}
                                class="g-textarea"
                                placeholder="z.B. Hintergrundinformationen, Beispiele, Vorlagen"
                                rows="5"
                            ></textarea>
                            <img
                                class="hide"
                                src={HideIcon}
                                on:click={() => {
                                    hideContext(idx);
                                }}
                            />
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
        <div class="instructions">
            <groupui-headline heading="h3">Aufgabe</groupui-headline>
            <textarea
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
            <button class="g-btn g-btn-tertiary" on:click={reset}>
                Zurücksetzen
            </button>
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
        display: grid;
        grid-template-areas:
            "sidebar input"
            "output output";
        grid-template-columns: 270px auto;
    }

    .input {
        grid-area: input;
        padding: 42px 0px;
        padding-bottom: 72px;
        background-color: white;
        display: grid;
        grid-template-columns: auto;
        grid-column-gap: 48px;
        grid-row-gap: 36px;
        width: 100%;

        > div {
            display: flex;
            flex-direction: column;
            overflow: auto;

            groupui-headline {
                padding-bottom: 12px;
            }

            label {
                font-size: 14px;
                font-weight: 700;
                padding-bottom: 2px;
            }

            .inner {
                display: flex;
                flex-direction: row;
                gap: 42px;
                overflow-x: auto;
                padding-right: 220px;
                padding-bottom: 1px;

                &::-webkit-scrollbar {
                    display: none;
                }

                > div {
                    display: flex;
                    flex-direction: column;
                }

                .new {
                    margin-left: 220px;
                }

                .context {
                    min-width: 440px;
                    max-width: 440px;
                    position: relative;

                    .hide {
                        position: absolute;
                        top: 16px;
                        right: -8px;
                        cursor: pointer;
                    }
                }
            }
        }

        .contexts {
            groupui-headline {
                margin-left: 220px;
            }

            button.new_context {
                background-color: white;
                border: 1px solid
                    var(--groupui-vwgroup-ref-color-vivid-green-600);
                border-radius: 4px;
                height: 138px;
                width: 90px;
                cursor: pointer;

                &:hover {
                    background-color: var(
                        --groupui-vwgroup-ref-color-vivid-green-100
                    );
                }
            }
        }

        .instructions,
        .sliders,
        .buttons {
            padding: 0 220px;
            padding-bottom: 1px;
        }

        .sliders {
            display: grid;
            grid-template-columns: auto auto;
            grid-column-gap: 120px;
            margin-top: -18px;

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
            flex-direction: row;
            justify-content: right;
            gap: 16px;
        }
    }

    .output {
        grid-area: output;
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

    .sidebar {
        grid-area: sidebar;
        background-color: white;
        border-right: 1px solid var(--groupui-vwgroup-ref-color-grey-200);
    }
</style>
