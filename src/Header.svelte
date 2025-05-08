<script>
    import { store as authStore, logout } from "./lib/auth";
</script>

<header>
    {#if $authStore.copilot_token}
        <span
            tabindex="0"
            role="button"
            onkeypress={() => {}}
            onclick={() => {
                logout();
            }}>Ausloggen</span
        >
    {/if}
</header>

<style>
    header {
        height: 64px;
        padding: 0 72px;
        background-color: var(--color-header);
        display: flex;
        flex-direction: row-reverse;
        align-items: center;

        span {
            color: white;
            cursor: pointer;
        }
    }
</style>
