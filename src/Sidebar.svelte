<script>
    /** @typedef {{content?: string, title?: string, hidden?: boolean}} Context */
    /** @type {{contexts: Context[], select: (s: number) => void}} */
    let { contexts, select } = $props();
</script>

<nav>
    {#if contexts.length == 0}
        Noch nichts gespeichert.
    {/if}
    {#each contexts as context, idx}
        <section
            role="button"
            tabindex="0"
            onclick={() => {
                select(idx);
            }}
            onkeydown={() => {}}
            class:active={!context.hidden}
        >
            {#if context == null}
                <groupui-loading size="s" embedded></groupui-loading>
            {:else}
                {context.title}
            {/if}
        </section>
    {/each}
</nav>

<style>
    nav {
        padding-top: 40px;
        padding-left: 24px;
        color: var(--groupui-vwgroup-ref-color-grey-400);

        section {
            padding: 11px 0;
            cursor: pointer;
            color: var(--groupui-vwgroup-ref-color-vivid-green-600);

            &.active {
                font-weight: bold;
            }
        }
    }
</style>
