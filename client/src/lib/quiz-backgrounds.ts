export interface BackgroundImage {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

// This will be populated dynamically from the server
export let QUIZ_BACKGROUND_IMAGES: BackgroundImage[] = [];

// Function to update the images list from server
export const updateBackgroundImages = (images: BackgroundImage[]) => {
  QUIZ_BACKGROUND_IMAGES.length = 0;
  QUIZ_BACKGROUND_IMAGES.push(...images);
};

export const getBackgroundsByCategory = (category: string): BackgroundImage[] => {
  return QUIZ_BACKGROUND_IMAGES.filter(bg => bg.category === category || category === 'All');
};

export const getBackgroundById = (id: string): BackgroundImage | undefined => {
  return QUIZ_BACKGROUND_IMAGES.find(bg => bg.id === id);
};

export const getAllCategories = (): string[] => {
  const categories = [...new Set(QUIZ_BACKGROUND_IMAGES.map(bg => bg.category))];
  return categories.sort();
};