import os
from dotenv import load_dotenv
from PIL import Image
import pytesseract
import time

from langchain_community.document_loaders import (
    PyMuPDFLoader, DirectoryLoader, Docx2txtLoader,
    TextLoader, UnstructuredPowerPointLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import SentenceTransformerEmbeddings 
from langchain_community.vectorstores import Chroma
from langchain.docstore.document import Document


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

    print("Carregando modelo de embedding local...")
    embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")

    print(f"Criando/sobrescrevendo banco de dados local no ChromaDB em '{CHROMA_DB_PATH}'...")
    
    vectorstore = Chroma.from_documents(
        documents=texts,
        embedding=embeddings,
        persist_directory=CHROMA_DB_PATH
    )
    
    print("-" * 50)
    print("Processo concluído! Sua base de conhecimento foi recriada com a nova estratégia.")
    print("-" * 50)
else:
    print("Nenhum documento foi carregado.")