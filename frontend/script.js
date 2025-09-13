document.addEventListener('DOMContentLoaded', () => {

    const chatBox = document.getElementById('chat-box');
    if (!chatBox) {
        return; 
    }

   
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

   
    if (userRole === 'admin') {
        const addContentBtn = document.createElement('button');
        addContentBtn.id = 'add-content-btn';
        addContentBtn.textContent = 'Adicionar Conhecimento';
        // Insere o novo botão antes do botão de logout
        headerButtons.insertBefore(addContentBtn, logoutBtn); 

        addContentBtn.addEventListener('click', () => {
            feedbackTitle.textContent = 'Adicionar Novo Conhecimento';
            feedbackQuestionInput.value = ''; 
            correctAnswerInput.value = '';
            showTeachForm();
        });
    }

    
    function addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        const paragraph = document.createElement('p');
        paragraph.innerHTML = text.replace(/\n/g, '<br>');
        messageElement.appendChild(paragraph);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function showLoadingIndicator() {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'loading');
        loadingElement.id = 'loading-indicator';
        loadingElement.innerHTML = '<p>...</p>';
        chatBox.appendChild(loadingElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function hideLoadingIndicator() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            chatBox.removeChild(loadingElement);
        }
    }

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
            const response = await fetch('https://chatbot-empresa-production.up.railway.app/ensinar', {
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
            const response = await fetch('https://chatbot-empresa-production.up.railway.app/perguntar', {
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
            addMessage(data.answer, 'bot');

            const lowerCaseAnswer = data.answer.toLowerCase();
            if ((lowerCaseAnswer.includes("não sei") || lowerCaseAnswer.includes("não encontrei")) && userRole === 'admin') {
                feedbackTitle.textContent = 'A resposta não foi útil? Ensine o bot!';
                feedbackQuestionInput.value = lastQuestion;
                showTeachForm();
            }
        } catch (error) {
            hideLoadingIndicator();
            console.error('Erro:', error);
            addMessage('Não foi possível conectar ao chatbot. Verifique se o servidor está rodando.', 'bot');
        }
    }
    
    function handleLogout() {
        sessionStorage.removeItem('userRole');
        window.location.href = 'login.html';
    }

    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') sendMessage();
    });
    saveAnswerBtn.addEventListener('click', saveNewAnswer);
    logoutBtn.addEventListener('click', handleLogout);
    cancelFeedbackBtn.addEventListener('click', hideTeachForm);
});
