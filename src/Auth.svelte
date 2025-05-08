<script>
    import { onMount } from "svelte";
    import {
        getDeviceCode,
        store as authStore,
        waitForAuth,
        check,
    } from "./lib/auth";
    import { get } from "svelte/store";

    onMount(async () => {
        await auth();
    });

    async function auth() {
        await check();
        if (!get(authStore).authenticated) {
            await getDeviceCode();
            await waitForAuth();
        }
    }
</script>

<main>
    {#if $authStore.user_code}
        Melde dich mit folgendem Code in Github an:
        <section class="code">
            {#if $authStore.loading}
                <groupui-loading embedded></groupui-loading>
            {:else}
                {$authStore.user_code}
            {/if}
            <span
                role="button"
                onclick={() => {
                    navigator.clipboard.writeText($authStore.user_code);
                }}
                tabindex="0"
                onkeypress={() => {}}
                ><img
                    alt="copy"
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNS41IDEwQzE1LjUgOS40NDc3MiAxNS4wNTIzIDkgMTQuNSA5SDUuNUM0Ljk0NzcyIDkgNC41IDkuNDQ3NzIgNC41IDEwVjE5QzQuNSAxOS41NTIzIDQuOTQ3NzIgMjAgNS41IDIwSDE0LjVDMTUuMDUyMyAyMCAxNS41IDE5LjU1MjMgMTUuNSAxOVYxMFpNOC41IDVDOC41IDMuODk1NDMgOS4zOTU0MyAzIDEwLjUgM0gxOS41QzIwLjYwNDYgMyAyMS41IDMuODk1NDMgMjEuNSA1VjE0QzIxLjUgMTUuMTA0NiAyMC42MDQ2IDE2IDE5LjUgMTZIMTYuNVYxOUMxNi41IDIwLjEwNDYgMTUuNjA0NiAyMSAxNC41IDIxSDUuNUM0LjM5NTQzIDIxIDMuNSAyMC4xMDQ2IDMuNSAxOVYxMEMzLjUgOC44OTU0MyA0LjM5NTQzIDggNS41IDhIMTQuNUMxNS42MDQ2IDggMTYuNSA4Ljg5NTQzIDE2LjUgMTBWMTVIMTkuNUMyMC4wNTIzIDE1IDIwLjUgMTQuNTUyMyAyMC41IDE0VjVDMjAuNSA0LjQ0NzcyIDIwLjA1MjMgNCAxOS41IDRIMTAuNUM5Ljk0NzcyIDQgOS41IDQuNDQ3NzIgOS41IDVWNkg4LjVWNVoiIGZpbGw9IiMwMDgwNzUiLz4KPC9zdmc+Cg=="
                /></span
            >
        </section>
        <a
            class="g-btn g-btn-medium gh"
            style="display: inline-block"
            href="https://github.com/login/device?skip_account_picker=true"
            target="_blank">Github öffnen</a
        >
    {:else}
        <groupui-loading size="xxl"></groupui-loading>
    {/if}
</main>

<style>
    main {
        padding-top: 124px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .code {
        font-weight: bold;
        color: var(--groupui-vwgroup-ref-color-vivid-green-600);
        display: flex;
        gap: 8px;
    }

    .gh {
        margin-top: 28px;
    }

    [role="button"] {
        cursor: pointer;
    }
</style>
