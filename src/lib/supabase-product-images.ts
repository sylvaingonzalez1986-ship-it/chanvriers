/**
 * Supabase Product Images Management
 * Handles product image uploads for producers
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

// Check if Supabase is configured
export function isProductImagesConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Upload a product image to Supabase Storage
 * @param fileUri - Local file URI from camera or gallery
 * @param producerId - ID of the producer
 * @param productId - ID of the product
 * @returns Public URL of the uploaded image
 */
export async function uploadProductImage(
  fileUri: string,
  producerId: string,
  productId: string
): Promise<string> {
  if (!isProductImagesConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Read the file as blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  // Generate unique filename with producer/product path
  const timestamp = Date.now();
  const ext = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
  const finalName = `${producerId}/${productId}/${timestamp}.${ext}`;

  console.log('[ProductImages] Uploading image:', finalName);

  // Upload to Supabase Storage
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${finalName}`,
    {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: blob,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.warn('[ProductImages] Upload error:', error);
    throw new Error(`Erreur upload image: ${error}`);
  }

  // Return the public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${finalName}`;
  console.log('[ProductImages] Image uploaded:', publicUrl);

  return publicUrl;
}

/**
 * Delete a product image from Supabase Storage
 * @param imageUrl - Full URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!isProductImagesConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Extract file path from URL
  const pathMatch = imageUrl.match(new RegExp(`${PRODUCT_IMAGES_BUCKET}/(.+)$`));
  if (!pathMatch) {
    console.warn('[ProductImages] Could not extract path from URL:', imageUrl);
    return;
  }

  const filePath = pathMatch[1];
  console.log('[ProductImages] Deleting image:', filePath);

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${filePath}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.warn('[ProductImages] Delete error:', error);
  }
}

/**
 * Upload multiple product images
 * @param fileUris - Array of local file URIs
 * @param producerId - ID of the producer
 * @param productId - ID of the product
 * @returns Array of public URLs
 */
export async function uploadMultipleProductImages(
  fileUris: string[],
  producerId: string,
  productId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const uri of fileUris) {
    try {
      const url = await uploadProductImage(uri, producerId, productId);
      urls.push(url);
    } catch (error) {
      console.warn('[ProductImages] Error uploading image:', error);
      // Continue with other images even if one fails
    }
  }

  return urls;
}
