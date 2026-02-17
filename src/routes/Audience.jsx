import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import SearchBox from "../components/SearchBox";

export default function Audience() {
  const { slug } = useParams();
  const [valid, setValid] = useState(null);

  useEffect(() => {
    const check = async () => {
      const ref = doc(db, "slugs", slug);
      const snap = await getDoc(ref);
      setValid(snap.exists());
    };
    check();
  }, [slug]);

  // if (valid === null) return <h2>Loading...</h2>;
  if (!valid) return <h2>Invalid link</h2>;

  return <SearchBox slug={slug} />;
}
