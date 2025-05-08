<script>
    import Auth from "./Auth.svelte";
    import { history, send } from "./lib/chat";

    const firstMessage = {
        role: "assistant",
        component: Auth,
    };

    /** @typedef {{role: string, content?: string, component?: import('svelte').Component}} Message */
    /** @type {Message[]} */
    let messages = $state([firstMessage]);
    history.subscribe((h) => {
        messages = [firstMessage, ...h];
    });

    let inputMessage = $state("");
    let isLoading = $state(false);
    let chatContainer;

    // Function to handle sending a message
    async function sendMessage() {
        if (!inputMessage.trim()) return;

        // Clear input field
        const userMessage = inputMessage;
        inputMessage = "";

        // Show loading state
        isLoading = true;

        try {
            // This is where you would integrate with your API
            // For now, we'll simulate a response after a delay
            await send(userMessage);
        } catch (error) {
            console.error("Error in chat processing:", error);
        } finally {
            isLoading = false;
        }
    }

    // Auto-scroll to assistanttom when messages change
    $effect(() => {
        if (messages.length && chatContainer) {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 0);
        }
    });

    // Handle pressing Enter to send
    function handleKeydown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
</script>

<main>
    <div class="chat-container">
        <div class="chat-header">
            <h1>Chat Assistant</h1>
        </div>

        <div class="messages-container" bind:this={chatContainer}>
            {#each messages as message}
                <div class="message {message.role}">
                    <div class="message-content">
                        {#if message.content}
                            {message.content}
                        {/if}
                        {#if message.component}
                            <message.component />
                        {/if}
                    </div>
                </div>
            {/each}

            {#if isLoading}
                <div class="message assistant loading">
                    <Indicator />
                </div>
            {/if}
        </div>

        <div class="input-container">
            <textarea
                bind:value={inputMessage}
                onkeydown={handleKeydown}
                placeholder="Type your message here..."
                rows="1"
            ></textarea>
            <button
                onclick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
            >
                Send
            </button>
        </div>
    </div>
</main>

<style>
    main {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem;
    }

    .chat-container {
        width: 100%;
        height: calc(100vh - 3rem);
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .chat-header {
        padding: 1rem;
        background: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
    }

    .chat-header h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #212529;
    }

    .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .message {
        display: flex;
        margin-bottom: 1rem;
    }

    .message.user {
        justify-content: flex-end;
    }

    .message-content {
        max-width: 70%;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        font-size: 0.95rem;
        line-height: 1.4;
    }

    .user .message-content {
        background: #007bff;
        color: white;
        border-radius: 1rem 1rem 0 1rem;
    }

    .assistant .message-content {
        background: #f8f9fa;
        color: #212529;
        border-radius: 1rem 1rem 1rem 0;
    }

    .input-container {
        padding: 1rem;
        background: #f8f9fa;
        border-top: 1px solid #e9ecef;
        display: flex;
        gap: 0.5rem;
    }

    textarea {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid #dee2e6;
        border-radius: 0.5rem;
        resize: none;
        font-family: inherit;
        font-size: 0.95rem;
        line-height: 1.4;
        max-height: 100px;
    }

    button {
        padding: 0.75rem 1.5rem;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover:not(:disabled) {
        background: #0056b3;
    }

    button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
</style>
