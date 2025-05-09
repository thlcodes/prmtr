<script>
    import { store as authStore, logout } from "./lib/auth";
    import Logo from "./assets/prompete.svg";
</script>

<header>
    <figure>
        <img src={Logo} alt="prompete" />
        Prompete
    </figure>
    {#if $authStore.authenticated}
        <span
            tabindex="0"
            role="button"
            onkeypress={() => {}}
            onclick={async () => {
                await logout();
            }}>Ausloggen</span
        >
    {/if}
</header>

<style>
    header {
        color: white;
        height: 64px;
        padding: 0 24px;
        background-color: var(--color-header);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;

        span {
            color: white;
            cursor: pointer;
        }

        figure {
            display: flex;
            align-items: anchor-center;
            gap: 8px;
            padding: 0px;
            margin: 0px;
            font-weight: bold;
        }
    }
</style>
