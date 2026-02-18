import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useEffect } from "react";
import SearchBox from "../components/SearchBox";

export default function Audience() {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const ref = doc(db, "slugs", slug);
        const snap = await getDoc(ref);
        if (!active) return;
        if (!snap.exists()) {
          navigate("/invalid", { replace: true });
        }
      } catch (error) {
        if (!active) return;
        navigate("/invalid", { replace: true });
      }
    };

    check();

    return () => {
      active = false;
    };
  }, [slug, navigate]);

  return <SearchBox slug={slug} />;
}
