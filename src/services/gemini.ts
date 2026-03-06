import { GoogleGenAI } from "@google/genai";
import { Pet } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzePetHealth = async (pet: Pet) => {
  const prompt = `Você é um veterinário especialista. Analise o seguinte pet e dê recomendações de saúde detalhadas em português:
  Nome: ${pet.name}
  Espécie: ${pet.species}
  Raça: ${pet.breed}
  Peso: ${pet.weight}kg
  Idade: ${pet.age}
  Histórico: ${pet.healthRecords.map(h => `${h.type}: ${h.description} (${h.date})`).join(', ')}
  Vacinas: ${pet.vaccines.map(v => `${v.name} (${v.status} em ${v.date})`).join(', ')}
  Dê recomendações práticas sobre vacinas, alimentação, exercícios e cuidados preventivos.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};

export const generateDietPlan = async (pet: Pet) => {
  const prompt = `Você é um nutricionista veterinário. Crie um plano alimentar completo para o seguinte pet:
  Nome: ${pet.name}
  Espécie: ${pet.species}
  Raça: ${pet.breed}
  Peso: ${pet.weight}kg
  Idade: ${pet.age}
  Inclua quantidade diária, frequência, tipos de ração e alimentos proibidos.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};

export const generatePetImage = async (pet: Pet, style: string) => {
  const prompt = `A beautiful ${style} of a ${pet.breed} ${pet.species} named ${pet.name}, looking happy and healthy, professional quality.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
