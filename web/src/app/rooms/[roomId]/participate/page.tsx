import { ParticipantView } from "@/components/ParticipantView";

export default function ParticipatePage({ params }: { params: { roomId: string } }) {
  return <ParticipantView roomId={params.roomId} />;
}
