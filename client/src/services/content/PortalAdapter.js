/**
 * PortalAdapter - Abstract base class for partner portal integrations
 */

export class PortalAdapter {
  constructor(config = {}) {
    this.config = config;
    this.name = config.name || 'unknown-portal';
  }

  /**
   * Check if connected to portal
   */
  isConnected() {
    return !!this.config.apiKey || !!this.config.token;
  }

  /**
   * Sync profile to this portal
   */
  async syncProfile(profile) {
    throw new Error('syncProfile() must be implemented');
  }

  /**
   * Update profile on portal
   */
  async updateProfile(profileId, changes) {
    throw new Error('updateProfile() must be implemented');
  }

  /**
   * Sync gallery/photos
   */
  async syncGallery(profileId, gallery) {
    throw new Error('syncGallery() must be implemented');
  }

  /**
   * Get profile from portal
   */
  async getProfile(profileId) {
    throw new Error('getProfile() must be implemented');
  }

  /**
   * Format profile for this portal
   */
  formatProfile(profile) {
    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      age: profile.age,
      location: profile.location,
      languages: profile.languages,
      specialties: profile.specialties,
      rates: profile.rates,
      availability: profile.availability,
      photos: profile.photos || []
    };
  }

  /**
   * Validate profile data
   */
  validateProfile(profile) {
    if (!profile.id || !profile.name) {
      throw new Error('Profile missing required fields: id, name');
    }
    return true;
  }
}

export default PortalAdapter;
