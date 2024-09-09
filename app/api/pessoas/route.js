import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

// Configuração do banco PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'reconhecimento_facial',
  password: 'ds564',
  port: 7007,
});

// Cria a pasta para armazenar as imagens, se ainda não existir
const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Função para lidar com o upload de arquivos
const handleFileUpload = async (formData) => {
  const file = formData.get('image');
  if (!file) {
    throw new Error('Nenhuma imagem enviada.');
  }

  const fileExt = path.extname(file.name);
  const fileName = uuidv4() + fileExt;
  const filePath = path.join(uploadDir, fileName);
  
  // Salva o arquivo no diretório
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${fileName}`; // Retorna o caminho da imagem para o banco
};

// POST - Cadastrar pessoa
export async function POST(req) {
  try {
    const formData = await req.formData();
    const nome = formData.get('nome');
    const descritorFacial = formData.get('descritorFacial');
    
    // Lidar com o upload do arquivo
    const caminhoImagem = await handleFileUpload(formData);

    // Insere os dados no banco
    const result = await pool.query(
      'INSERT INTO pessoas (nome, caminho_imagem, descritor_facial) VALUES ($1, $2, $3) RETURNING *',
      [nome, caminhoImagem, descritorFacial]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Buscar todas as pessoas
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM pessoas');
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar pessoas no banco de dados' }, { status: 500 });
  }
}
