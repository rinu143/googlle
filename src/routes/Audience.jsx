import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect, useState } from "react";
import SearchBox from "../components/SearchBox";

export default function Audience() {
  const { slug } = useParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const check = async () => {
      setStatus("loading");
      try {
        const ref = doc(db, "slugs", slug);
        const snap = await getDoc(ref);
        if (!active) return;
        setStatus(snap.exists() ? "valid" : "invalid");
      } catch (error) {
        if (!active) return;
        setStatus("invalid");
      }
    };

    check();

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") return <div />;
  if (status === "invalid") return <h2>Invalid link</h2>;

  return <SearchBox slug={slug} />;
}
