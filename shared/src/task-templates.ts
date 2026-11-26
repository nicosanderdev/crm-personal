export type TaskTemplate = {
  id: string;
  label: string;
  name: string;
  description: string;
};

export const TASK_TEMPLATES: readonly TaskTemplate[] = [
  {
    id: "share-news",
    label: "Compartir una noticia",
    name: "Compartir una noticia",
    description: "Qué noticia, por qué le puede interesar, y un comentario propio.",
  },
  {
    id: "share-joke",
    label: "Compartir un chiste",
    name: "Compartir un chiste",
    description: "El chiste o el link, y por qué se lo mando a esta persona.",
  },
  {
    id: "share-post",
    label: "Compartir una publicación",
    name: "Compartir una publicación",
    description: "Qué publicación (link o título) y qué quiero decir al enviarla.",
  },
  {
    id: "share-memory",
    label: "Compartir un recuerdo",
    name: "Compartir un recuerdo",
    description: "Qué momento quiero traer y cómo se lo voy a contar.",
  },
  {
    id: "give-gift",
    label: "Dar un regalo",
    name: "Dar un regalo",
    description: "Qué regalo, para qué ocasión, y cómo se lo entrego.",
  },
  {
    id: "help-project",
    label: "Ayudar en un proyecto",
    name: "Ayudar en un proyecto",
    description: "En qué proyecto, qué ayuda concreta ofrezco, y para cuándo.",
  },
  {
    id: "introduce-someone",
    label: "Presentarle a alguien",
    name: "Presentarle a alguien",
    description: "A quién presento, por qué encajan, y cómo hago la intro.",
  },
  {
    id: "show-interest",
    label: "Demostrar interés",
    name: "Demostrar interés",
    description: "Sobre qué tema pregunto y qué quiero saber.",
  },
  {
    id: "share-knowledge",
    label: "Compartir conocimiento",
    name: "Compartir conocimiento",
    description: "Qué le puede servir y cómo se lo paso (link, nota o charla).",
  },
  {
    id: "invite-event",
    label: "Invitar a un evento",
    name: "Invitar a un evento",
    description: "Qué evento, cuándo y dónde, y por qué lo invito.",
  },
];
