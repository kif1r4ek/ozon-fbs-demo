import { PostingCard } from "./PostingCard";

export function PostingsList({ postings }) {
  if (postings.length === 0) {
    return (
      <div className="empty-state">
        Заданий не найдено
      </div>
    );
  }

  return (
    <div className="postings-list">
      {postings.map((posting) => (
        <PostingCard key={posting.postingNumber} posting={posting} />
      ))}
    </div>
  );
}
