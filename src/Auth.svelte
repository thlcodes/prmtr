<script>
    import { onMount } from "svelte";
    import Indicator from "./Indicator.svelte";
    import {
        getDeviceCode,
        store as authStore,
        waitForAccessToken,
        getCopilotToken,
        getUser,
        logout,
    } from "./lib/auth";
    import { get } from "svelte/store";

    onMount(async () => {
        await auth();
    });

    async function auth() {
        if (!get(authStore).access_token) {
            await getDeviceCode();
            await waitForAccessToken();
        }
        await getUser();
        await getCopilotToken();
    }
</script>

{#if $authStore.copilot_token}
    Hi <i>@{$authStore.user || "unknown"}</i>, you are good to go!
    <span
        role="button"
        onclick={async () => {
            logout();
            await auth();
        }}>🚪</span
    >
{:else if $authStore.access_token}
    Authenticating <Indicator />
{:else if $authStore.user_code}
    Please authenticate via <a
        href="https://github.com/login/device?skip_account_picker=true"
        target="new">Github</a
    >
    with the following code:
    <b>{$authStore.user_code}</b>
    <span
        role="button"
        onclick={() => {
            navigator.clipboard.writeText($authStore.user_code);
        }}>📋</span
    >
{:else}
    <Indicator />
{/if}

<style>
    [role="button"] {
        cursor: pointer;
    }
</style>
