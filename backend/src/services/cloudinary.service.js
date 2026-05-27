const cloudinary = require('../config/cloudinary');
const { BadRequestError } = require('../utils/errors');

class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   */
  async uploadFile(fileBuffer, options = {}) {
    const {
      folder = 'agrasen-setu',
      resourceType = 'auto',
      publicId,
      transformations = {},
    } = options;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: publicId,
          ...transformations,
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestError(`File upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              size: result.bytes,
              width: result.width,
              height: result.height,
            });
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Upload profile picture with transformations
   */
  async uploadProfilePicture(fileBuffer, userId) {
    return this.uploadFile(fileBuffer, {
      folder: 'agrasen-setu/profiles',
      publicId: `profile_${userId}`,
      transformations: {
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        overwrite: true,
      },
    });
  }

  /**
   * Upload ID proof document
   */
  async uploadIdProof(fileBuffer, userId) {
    return this.uploadFile(fileBuffer, {
      folder: 'agrasen-setu/id-proofs',
      publicId: `id_${userId}_${Date.now()}`,
      resourceType: 'auto',
    });
  }

  /**
   * Upload post attachment
   */
  async uploadPostAttachment(fileBuffer, postId, fileName) {
    return this.uploadFile(fileBuffer, {
      folder: 'agrasen-setu/posts',
      publicId: `post_${postId}_${Date.now()}`,
      resourceType: 'auto',
    });
  }

  /**
   * Delete a file from Cloudinary
   */
  async deleteFile(publicId) {
    return cloudinary.uploader.destroy(publicId);
  }
}

module.exports = new CloudinaryService();
