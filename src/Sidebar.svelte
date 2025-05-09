<script>
    /** @type {{entries: string[], current: string|null}} */
    let { entries, current = $bindable() } = $props();
</script>

<nav>
    {#if entries.length == 0}
        Noch nichts gespeichert.
    {/if}
    {#each entries as entry}
        <section
            role="button"
            tabindex="0"
            onclick={() => {
                current = entry;
            }}
            onkeydown={() => {}}
        >
            {#if entry == null}
                <groupui-loading size="s" embedded></groupui-loading>
            {:else}
                {entry}
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
        }
    }
</style>
