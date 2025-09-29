import { db, storage, COLLECTIONS } from './firebase-config';
import { v4 as uuidv4 } from 'uuid';

export interface BackgroundImage {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class ImageService {
  private imagesCollection = COLLECTIONS.QUIZ_BACKGROUND_IMAGES;
  private storageBucket = storage.bucket();

  async uploadImage(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    metadata: {
      name: string;
      category: string;
      description: string;
      uploadedBy: string;
    }
  ): Promise<{ id: string; url: string; message: string }> {
    try {
      const imageId = uuidv4();
      let publicUrl: string;
      let fileName: string;
      let useFirebaseStorage = false;

      try {
        // Try Firebase Storage first
        const fileExtension = originalFileName.split('.').pop() || 'jpg';
        fileName = `quiz-images/${uuidv4()}.${fileExtension}`;

        console.log('[ImageService] Attempting upload to Firebase Storage:', fileName);
        const file = this.storageBucket.file(fileName);

        await file.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              originalName: originalFileName,
              uploadedBy: metadata.uploadedBy,
            }
          }
        });

        // Make the file publicly readable
        await file.makePublic();

        // Get the public URL
        publicUrl = `https://storage.googleapis.com/${this.storageBucket.name}/${fileName}`;
        useFirebaseStorage = true;
        console.log('[ImageService] Successfully uploaded to Firebase Storage');

      } catch (storageError) {
        console.log('[ImageService] Firebase Storage not available, checking fallback options:', storageError.message);

        // Check if the file is too large for base64 storage in Firestore (1MB limit)
        // Base64 encoding increases size by ~33%, so we need even more headroom
        if (fileBuffer.length > 300000) { // 300KB limit to ensure encoded size stays under 1MB
          console.error('[ImageService] File too large for fallback storage:', {
            originalSize: fileBuffer.length,
            estimatedBase64Size: Math.round(fileBuffer.length * 1.33),
            limit: 1048487
          });
          throw new Error(`File too large for fallback storage (${Math.round(fileBuffer.length / 1024)}KB). Firebase Storage is required for files over 300KB. Please set up Firebase Storage or use a smaller image.`);
        }

        // Fallback to base64 data URL for smaller images
        const base64Data = fileBuffer.toString('base64');
        publicUrl = `data:${mimeType};base64,${base64Data}`;
        fileName = `fallback_${imageId}.${originalFileName.split('.').pop() || 'jpg'}`;

        console.log('[ImageService] Using base64 fallback for small file:', {
          originalSize: fileBuffer.length,
          base64Size: base64Data.length
        });
      }

      // Save metadata to Firestore
      const imageData: Omit<BackgroundImage, 'id'> = {
        name: metadata.name,
        url: publicUrl,
        category: metadata.category,
        description: metadata.description,
        fileName: fileName,
        fileSize: fileBuffer.length,
        mimeType,
        uploadedBy: metadata.uploadedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection(this.imagesCollection).doc(imageId).set(imageData);

      console.log('[ImageService] Successfully saved image metadata:', {
        imageId,
        urlType: useFirebaseStorage ? 'firebase-storage' : 'base64-fallback',
        fileSize: fileBuffer.length
      });

      return {
        id: imageId,
        url: publicUrl,
        message: useFirebaseStorage ? 'Image uploaded successfully' : 'Image uploaded successfully (using fallback storage)'
      };
    } catch (error) {
      console.error('[ImageService] Error uploading image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async getAllImages(): Promise<BackgroundImage[]> {
    try {
      const snapshot = await db.collection(this.imagesCollection)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as BackgroundImage[];
    } catch (error) {
      console.error('[ImageService] Error getting all images:', error);
      throw new Error(`Failed to get images: ${error.message}`);
    }
  }

  async deleteImage(imageId: string): Promise<void> {
    try {
      // Get image metadata from Firestore
      const doc = await db.collection(this.imagesCollection).doc(imageId).get();

      if (!doc.exists) {
        throw new Error('Image not found');
      }

      const imageData = doc.data() as BackgroundImage;

      // Delete from Firebase Storage
      const file = this.storageBucket.file(imageData.fileName);
      await file.delete();

      // Delete from Firestore
      await db.collection(this.imagesCollection).doc(imageId).delete();

      console.log('[ImageService] Successfully deleted image:', imageId);
    } catch (error) {
      console.error('[ImageService] Error deleting image:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  async getImagesByCategory(category: string): Promise<BackgroundImage[]> {
    try {
      const snapshot = await db.collection(this.imagesCollection)
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as BackgroundImage[];
    } catch (error) {
      console.error('[ImageService] Error getting images by category:', error);
      throw new Error(`Failed to get images by category: ${error.message}`);
    }
  }

  async uploadFlashCardImage(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    uploadedBy: string
  ): Promise<{ url: string }> {
    try {
      const fileExtension = originalFileName.split('.').pop() || 'jpg';
      const fileName = `flashcard-images/${uuidv4()}.${fileExtension}`;

      console.log('[ImageService] Uploading flashcard image to Firebase Storage:', fileName);
      const file = this.storageBucket.file(fileName);

      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      // Make the file publicly readable
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${this.storageBucket.name}/${fileName}`;
      console.log('[ImageService] Flashcard image uploaded successfully:', publicUrl);

      return { url: publicUrl };
    } catch (error) {
      console.error('[ImageService] Error uploading flashcard image:', error);
      throw new Error('Failed to upload flashcard image');
    }
  }
}

export const imageService = new ImageService();
export default imageService;