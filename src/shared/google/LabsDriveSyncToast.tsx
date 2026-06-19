import LabsFeedbackToast from '../components/LabsFeedbackToast';

type LabsDriveSyncToastProps = {
  message: string | null;
  onClose: () => void;
};

/** Transient Drive sync success toast (portfolio apps). */
export default function LabsDriveSyncToast({ message, onClose }: LabsDriveSyncToastProps) {
  return <LabsFeedbackToast message={message} severity="success" onClose={onClose} />;
}
