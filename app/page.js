"use client";

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';

export default function Home() {
  const [nome, setNome] = useState('');
  const [imagem, setImagem] = useState(null);
  const [resultado, setResultado] = useState(null);
  const webcamRef = useRef(null);

  // Carregar modelos face-api.js
  useEffect(() => {
    const carregarModelos = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    };
    carregarModelos();
  }, []);

  // Função para converter a URL blob para um arquivo
  const dataURLToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Função para cadastrar a pessoa no banco de dados
  const handleCadastro = async () => {
    if (!nome || !imagem) {
      alert('Por favor, insira um nome e uma imagem!');
      return;
    }

    // Converte a URL da imagem (blob) em um arquivo
    const file = dataURLToFile(imagem, 'captured_image.jpg');

    // Criar um elemento de imagem temporário para detectar o rosto e obter o descritor facial
    const imgElement = document.createElement('img');
    imgElement.src = imagem;

    // Detectar o rosto e gerar o descritor facial
    const detections = await faceapi.detectAllFaces(imgElement).withFaceLandmarks().withFaceDescriptors();
    
    if (detections.length > 0) {
      const descritorFacial = JSON.stringify(detections[0].descriptor);

      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('image', file); // A imagem convertida vai no campo 'image'
      formData.append('descritorFacial', descritorFacial); // O descritor facial vai como texto

      try {
        await axios.post('/api/pessoas', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Pessoa cadastrada com sucesso!');
      } catch (error) {
        console.error('Erro ao cadastrar a pessoa:', error);
        alert('Erro ao cadastrar a pessoa.');
      }
    } else {
      alert('Nenhum rosto detectado na imagem.');
    }
  };

  // Função para capturar a imagem da webcam
  const capturarImagem = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImagem(imageSrc); // Guardando a URL blob da imagem
  };

  // Função para detectar a pessoa usando a webcam
  const handleReconhecimento = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    
    // Criar um elemento de imagem temporário para processar a imagem capturada
    const imgElement = document.createElement('img');
    imgElement.src = screenshot;

    const detections = await faceapi.detectAllFaces(imgElement).withFaceLandmarks().withFaceDescriptors();

    // Buscar pessoas cadastradas na API
    const res = await axios.get('/api/pessoas');
    const pessoas = res.data;

    console.log({screenshot});
    console.log({detections});
    console.log({pessoas});
    // Criar um FaceMatcher com as pessoas cadastradas
    const faceMatcher = new faceapi.FaceMatcher(
      pessoas.map((pessoa) => ({
        descriptor: new Float32Array(JSON.parse(pessoa.descritor_facial)),
        label: pessoa.nome,
      }))
    );

    const resultados = detections.map((d) => faceMatcher.findBestMatch(d.descriptor));
    setResultado(resultados);
  };

  return (
    <div>
      <h1>Cadastro de Pessoa</h1>
      <div>
        <input 
          type="text" 
          placeholder="Nome" 
          value={nome} 
          onChange={(e) => setNome(e.target.value)} 
        />
        <button onClick={handleCadastro}>Cadastrar Pessoa</button>
      </div>
      
      <h2>Reconhecimento Facial com Webcam</h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width="300"
      />
      <button onClick={capturarImagem}>Capturar Imagem</button>
      <button onClick={handleReconhecimento}>Reconhecer Pessoa</button>
      {resultado && (
        <div>
          <h3>Resultado do Reconhecimento:</h3>
          {resultado.map((res, index) => (
            <p key={index}>
              {res.label === 'unknown' ? 'Não reconhecido' : `Reconhecido como: ${res.label}`}
            </p>
          ))}
        </div>
      )}
      {imagem && <img src={imagem} alt="Imagem capturada" width="300" />}
    </div>
  );
}
