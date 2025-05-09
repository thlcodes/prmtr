<script>
    import TrashIcon from "./assets/trash.svg";

    /** @typedef {{content?: string, title?: string, hidden?: boolean}} Context */
    /** @type {{contexts: Context[], select: (idx: number) => void, del: (idx: number) => void}} */
    let { contexts, select, del } = $props();
</script>

<nav>
    {#if contexts.filter(($) => !!$.title).length == 0}
        <span class="empty">Noch nichts gespeichert.</span>
    {/if}
    {#each contexts as context, idx}
        {#if context.title}
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
                <img
                    class="delete"
                    src={TrashIcon}
                    alt="delete"
                    onclick={(e) => {
                        e.stopPropagation();
                        del(idx);
                    }}
                />
            </section>
        {/if}
    {/each}
</nav>

<style>
    nav {
        padding-top: 40px;
        color: var(--groupui-vwgroup-ref-color-grey-400);

        .empty {
            padding-left: 24px;
        }

        section {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            padding: 11px 0;
            padding-left: 24px;
            padding-right: 12px;
            cursor: pointer;
            color: var(--groupui-vwgroup-ref-color-vivid-green-600);
            border-left: 2px solid transparent;

            &.active {
                font-weight: bold;
                border-left: 2px solid
                    var(--groupui-vwgroup-ref-color-vivid-green-600);
            }

            &:hover {
                .delete {
                    display: initial;
                }
            }

            .delete {
                display: none;
            }
        }
    }
</style>
