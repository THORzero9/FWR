import { NearbyUser } from "@shared/schema";

interface NearbyUserCardProps {
  user: NearbyUser;
}

export default function NearbyUserCard({ user }: NearbyUserCardProps) {
  // Format distance
  const formatDistance = (distance: number) => {
    // distance is stored as miles * 10 for precision
    return (distance / 10).toFixed(1);
  };
  
  // Generate star rating
  const starRating = () => {
    const fullStars = Math.floor(user.rating / 10);
    const halfStar = user.rating % 10 >= 5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <div className="flex items-center text-primary">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="material-icons text-sm">star</span>
        ))}
        {halfStar && (
          <span className="material-icons text-sm">star_half</span>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="material-icons text-sm">star_outline</span>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden mr-4">
        {user.imageUrl ? (
          <img 
            src={user.imageUrl} 
            alt={user.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200">
            <span className="material-icons text-neutral-400">person</span>
          </div>
        )}
      </div>
      <div className="flex-grow">
        <h4 className="font-medium">{user.name}</h4>
        <p className="text-sm text-neutral-500">{formatDistance(user.distance)} miles away</p>
        {starRating()}
      </div>
      <button className="text-primary font-medium text-sm">Contact</button>
    </div>
  );
}
