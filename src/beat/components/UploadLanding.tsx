import React from 'react';
import MediaUploader, { type MediaFile } from './MediaUploader';
import LandingFeatureGrid from './LandingFeatureGrid';

interface UploadLandingProps {
  onFileSelect: (media: MediaFile) => void;
}

const UploadLanding: React.FC<UploadLandingProps> = ({ onFileSelect }) => {
  return (
    <>
      <div className="landing-info">
        <p className="landing-description">
          Analyze videos or sound files for your music practice.
        </p>
      </div>
      <MediaUploader onFileSelect={onFileSelect} />
      <div className="landing-feature-zone">
        <LandingFeatureGrid />
      </div>
    </>
  );
};

export default UploadLanding;
