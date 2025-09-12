import os
from dotenv import load_dotenv
from PIL import Image
import pytesseract

from langchain_community.document_loaders import (
    PyMuPDFLoader, DirectoryLoader, Docx2txtLoader,
    TextLoader, UnstructuredPowerPointLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings 
from langchain_community.vectorstores import Chroma
from langchain.docstore.document import Document
import time 


load_dotenv()
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

DATA_PATH = "site_conteudo/"
CHROMA_DB_PATH = "chroma_db"

def process_images_with_ocr(path):
    
    image_docs = []
    image_extensions = (".png", ".jpg", ".jpeg", ".tiff", ".bmp")
    print("Iniciando processamento de imagens com OCR...")
    image_paths = []
    for root, _, files in os.walk(path):
        for filename in files:
            if filename.lower().endswith(image_extensions):
                image_paths.append(os.path.join(root, filename))
    for image_path in image_paths:
        try:
            text = pytesseract.image_to_string(Image.open(image_path))
            if text.strip():
                metadata = {"source": image_path}
                doc = Document(page_content=text, metadata=metadata)
                image_docs.append(doc)
                print(f"  - Texto extraído de: {os.path.basename(image_path)}")
        except Exception as e:
            print(f"  - Erro ao processar a imagem {os.path.basename(image_path)}: {e}")
    print(f"{len(image_docs)} imagens processadas com sucesso.")
    return image_docs


print("\n--- INICIANDO PROCESSAMENTO GERAL COM CHUNKING OTIMIZADO ---")

txt_loader = DirectoryLoader(DATA_PATH, glob="**/*.txt", loader_cls=TextLoader, show_progress=True, use_multithreading=True, loader_kwargs={'encoding': 'utf-8'})
txt_docs = txt_loader.load()
pdf_loader = DirectoryLoader(DATA_PATH, glob="**/*.pdf", loader_cls=PyMuPDFLoader, show_progress=True, use_multithreading=True)
pdf_docs = pdf_loader.load()
docx_loader = DirectoryLoader(DATA_PATH, glob="**/*.docx", loader_cls=Docx2txtLoader, show_progress=True, use_multithreading=True)
docx_docs = docx_loader.load()
pptx_loader = DirectoryLoader(DATA_PATH, glob="**/*.pptx", loader_cls=UnstructuredPowerPointLoader, show_progress=True, use_multithreading=True)
pptx_docs = pptx_loader.load()

documents = txt_docs + pdf_docs + docx_docs + pptx_docs
image_documents = process_images_with_ocr(DATA_PATH)
all_documents = documents + image_documents
print(f"Total de documentos a serem processados: {len(all_documents)}")

if all_documents:
    
    
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=750, chunk_overlap=200)
    
    texts = text_splitter.split_documents(all_documents)
    print(f"Documentos divididos em {len(texts)} chunks (com nova estratégia).")

    print("Gerando embeddings com a API do Google")
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    print(f"Criando/sobrescrevendo banco de dados local no ChromaDB em '{CHROMA_DB_PATH}'...")
    
    batch_size = 100 
    total_batches = (len(texts) + batch_size - 1) // batch_size
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"Processando lote {i//batch_size + 1}/{total_batches}...")
        if i == 0:
            vectorstore = Chroma.from_documents(documents=batch, embedding=embeddings, persist_directory=CHROMA_DB_PATH)
        else:
            vectorstore.add_documents(batch)
        if total_batches > 1 and (i//batch_size + 1) < total_batches:
            print("Lote processado. Aguardando 61 segundos...")
            time.sleep(61)
    
    print("Processo concluído!")