import { PostingCard } from "./PostingCard";

export function DeliverPostingsList({ postings, labels = [] }) {
  if (postings.length === 0) {
    return (
      <div className="empty-state">
        Отправлений не найдено
      </div>
    );
  }

  // Создаем Map для быстрого поиска
  const labelsMap = new Map();
  labels.forEach((label) => {
    labelsMap.set(label.postingNumber, label);
  });

  return (
    <div className="postings-list">
      {postings.map((posting) => {
        const label = labelsMap.get(posting.postingNumber);
        return (
          <PostingCard
            key={posting.postingNumber}
            posting={posting}
            variant="deliver"
            label={label}
          />
        );
      })}
    </div>
  );
}
