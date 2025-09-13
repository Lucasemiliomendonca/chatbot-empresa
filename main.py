import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.docstore.document import Document
 

load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USERS = {
    "empresa": {"password": "123", "role": "user"},
    "admin": {"password": "admin123", "role": "admin"}
}
 

class Query(BaseModel):
    question: str
 
class LoginRequest(BaseModel):
    username: str
    password: str
 
class TeachRequest(BaseModel):
    question: str
    correct_answer: str
 

llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0.7) 
embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma(persist_directory="chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={'k': 65}) 
 

template = """
Você é um assistente especialista no conteúdo de um site específico.
Use ESTREITAMENTE as informações do contexto a seguir para responder à pergunta. Você pode combinar informações de diferentes partes do contexto para fornecer uma resposta completa.
Você é um assistente especialista amigável e prestativo.
Pode também usar quebras de linha (\n) para organizar melhor a resposta e facilitar a leitura. Pode também usar listas numeradas ou com marcadores, se necessário. Pode usar negrito para destacar pontos importantes.
Nunca invente informações. Se não souber a resposta, diga "Desculpe, não sei a resposta para essa pergunta.".
Pode usar linguagem formal ou informal, dependendo do contexto da pergunta.
Pode usar emojis para tornar a resposta mais amigável, se apropriado.
Verifique todos os detalhes para garantir a precisão.
Verifique todo o contexto antes de responder.
Se a resposta não estiver no contexto ou no histórico, diga "Com base no meu conhecimento, não encontrei a resposta para esta pergunta.".
 
Contexto:
{context}
 
Pergunta:
{question}
 
Resposta útil:
"""
prompt = ChatPromptTemplate.from_template(template)
 

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
 

 
@app.post("/login")
def login(request: LoginRequest):
    user_data = USERS.get(request.username)
    if user_data and user_data["password"] == request.password:
        return {"success": True, "role": user_data["role"]}
    return {"success": False, "role": "none"}
 
@app.post("/perguntar")
def ask_question(query: Query):
    try:
        answer = chain.invoke(query.question)
        return {"answer": answer}
    except Exception as e:
        print(f"Erro em /perguntar: {e}")
        raise HTTPException(status_code=500, detail="Erro ao processar a pergunta.")
 
@app.post("/ensinar")
def teach_bot(data: TeachRequest):
    try:
        new_knowledge = f"Sobre a pergunta '{data.question}', a resposta correta é: {data.correct_answer}"
        new_doc = Document(page_content=new_knowledge, metadata={"source": "feedback_admin"})
        vectorstore.add_documents([new_doc])
        return {"message": "Aprendizado salvo com sucesso!"}
    except Exception as e:
        print(f"Erro ao salvar aprendizado: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar aprendizado.")
 
@app.get("/")
def read_root():
    return {"message": "API do Chatbot está no ar!"}
