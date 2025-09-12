document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do DOM
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackQuestionInput = document.getElementById('feedback-question-input');
    const correctAnswerInput = document.getElementById('correct-answer-input');
    const saveAnswerBtn = document.getElementById('save-answer-btn');
    const cancelFeedbackBtn = document.getElementById('cancel-feedback-btn');
    const headerButtons = document.querySelector('.header-buttons');

    const userRole = sessionStorage.getItem('userRole');
    let lastQuestion = ''; 

    // --- LÓGICA PARA ADMIN ---
    if (userRole === 'admin') {
        const addContentBtn = document.createElement('button');
        addContentBtn.id = 'add-content-btn';
        addContentBtn.textContent = 'Adicionar Conhecimento';
        headerButtons.insertBefore(addContentBtn, logoutBtn); // Adiciona o botão antes do de logout

        addContentBtn.addEventListener('click', () => {
            feedbackTitle.textContent = 'Adicionar Novo Conhecimento';
            feedbackQuestionInput.value = ''; // Limpa o campo do tópico
            showTeachForm();
        });
    }

    // --- FUNÇÕES DO CHAT ---
    function addMessage(text, sender) { /* ... (sem alterações) ... */ }
    function showLoadingIndicator() { /* ... (sem alterações) ... */ }
    function hideLoadingIndicator() { /* ... (sem alterações) ... */ }

    function showTeachForm() {
        feedbackContainer.style.display = 'flex';
    }

    function hideTeachForm() {
        feedbackContainer.style.display = 'none';
        correctAnswerInput.value = '';
        feedbackQuestionInput.value = '';
    }

    async function saveNewAnswer() {
        const questionToSave = feedbackQuestionInput.value.trim();
        const correctAnswer = correctAnswerInput.value.trim();

        if (correctAnswer === '' || questionToSave === '') {
            alert('Por favor, preencha o tópico e o conteúdo para salvar.');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/ensinar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: questionToSave,
                    correct_answer: correctAnswer,
                }),
            });
            
            if (response.ok) {
                addMessage('Obrigado! Aprendi o novo conteúdo.', 'bot');
            } else {
                addMessage('Desculpe, não consegui salvar o aprendizado.', 'bot');
            }
        } catch (error) {
            console.error('Erro ao ensinar:', error);
            addMessage('Erro de conexão ao tentar ensinar o bot.', 'bot');
        } finally {
            hideTeachForm();
        }
    }

    async function sendMessage() {
        const question = userInput.value.trim();
        if (question === '') return;
        
        lastQuestion = question;
        hideTeachForm();
        addMessage(question, 'user');
        userInput.value = '';
        showLoadingIndicator();

        try {
            const response = await fetch('http://127.0.0.1:8000/perguntar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question }),
            });

            hideLoadingIndicator();

            if (!response.ok) {
                addMessage('Desculpe, ocorreu um erro no servidor.', 'bot');
                return;
            }

            const data = await response.json();
            const formattedAnswer = data.answer.replace(/\n/g, '<br>');
            addMessage(formattedAnswer, 'bot');

            const lowerCaseAnswer = data.answer.toLowerCase();
            if ((lowerCaseAnswer.includes("não sei") || lowerCaseAnswer.includes("não encontrei")) && userRole === 'admin') {
                feedbackTitle.textContent = 'A resposta não foi útil? Ensine o bot!';
                feedbackQuestionInput.value = lastQuestion; // Preenche com a última pergunta
                showTeachForm();
            }
        } catch (error) {
            // ... (sem alterações)
        }
    }
    
    function handleLogout() {
        sessionStorage.removeItem('userRole');
        window.location.href = 'login.html';
    }

    // --- EVENT LISTENERS ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') sendMessage();
    });
    saveAnswerBtn.addEventListener('click', saveNewAnswer);
    logoutBtn.addEventListener('click', handleLogout);
    cancelFeedbackBtn.addEventListener('click', hideTeachForm);
});

// Cole aqui as funções addMessage, showLoadingIndicator, e hideLoadingIndicator que já tínhamos
function addMessage(text, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);
    const paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    messageElement.appendChild(paragraph);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
function showLoadingIndicator() { /* ... */ }
function hideLoadingIndicator() { /* ... */ }