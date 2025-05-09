<script>
    import { ask, stream } from "./lib/chat";
    import { marked } from "marked";
    import Sidebar from "./Sidebar.svelte";
    import { onMount, untrack } from "svelte";

    let context = $state("");
    let instruction = $state("");
    let temperature = $state(50);
    let reply_length = $state(50);

    let replies = $state([]);

    let loading = $state(false);

    /** @typedef {{name: string, context: string, instruction: string, temperature: number; reply_length: number}} Snapshot */
    /** @type {Snapshot[]} */
    let snapshots = $state([]);
    let saving = $state(false);
    /** @type {string|null} */
    let currentSnapshot = $state(null);

    $effect(() => {
        if (currentSnapshot) {
            untrack(() => {
                const snapshot = snapshots.find(
                    (e) => e.name == currentSnapshot,
                );
                if (snapshot) {
                    ({ context, instruction, temperature, reply_length } =
                        snapshot);
                }
            });
        }
    });

    onMount(() => {
        try {
            snapshots = JSON.parse(localStorage.getItem("snapshots") || "[]");
        } catch (e) {
            console.log("could not load snapshots:", e);
        }
    });

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

    async function save() {
        saving = true;
        snapshots = [...snapshots, null];
        const name = await deriveTitle(context);
        /** @type {Snapshot} */
        const snapshot = {
            name,
            context,
            instruction,
            temperature,
            reply_length,
        };
        snapshots[snapshots.length - 1] = snapshot;
        localStorage.setItem("snapshots", JSON.stringify(snapshots));
        saving = false;
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
        Do not include one of the following, already existing titles:
        ${snapshots
            .filter(($) => !!$)
            .map(($) => $.name)
            .join("\n")}
        `;
        const title = await ask(request, 0.1);
        return title;
    }

    let output;
</script>

<main>
    <section class="sidebar">
        <Sidebar
            bind:current={currentSnapshot}
            entries={snapshots.map((e) => e?.name)}
        />
    </section>
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
                class="g-btn g-btn-secondary"
                class:g-btn-disabled={saving}
                disabled={saving}
                on:click={save}
            >
                Speichern
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
