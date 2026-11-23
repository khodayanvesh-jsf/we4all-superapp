import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { APP_VERSION } from "../../appVersion";
import WindowsDesktopApp from "./WindowsDesktopApp";

export default function StandaloneWindowsApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [partnerRole, setPartnerRole] = useState("");
  const [orders, setOrders] = useState([]);
  const [serviceBookings, setServiceBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [labourBookings, setLabourBookings] = useState([]);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(String(msg || ""));
    setTimeout(() => setToast(""), 3500);
  };

  const loadLiveCloudData = async (userObj) => {
    if (!supabase || !userObj?.authUserId) return;
    try {
      const [ordRes, prodRes, svcRes, labRes] = await Promise.all([
        supabase.from("we4all_orders").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("we4all_catalog_items").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("we4all_service_bookings").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("we4all_labour_bookings").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      if (Array.isArray(ordRes?.data)) setOrders(ordRes.data);
      if (Array.isArray(prodRes?.data)) setProducts(prodRes.data);
      if (Array.isArray(svcRes?.data)) setServiceBookings(svcRes.data);
      if (Array.isArray(labRes?.data)) setLabourBookings(labRes.data);
    } catch { /* RLS scoped by role */ }
  };

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) return;
      const { data: partnerRow } = await supabase
        .from("we4all_partners")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (partnerRow?.role) {
        const profile = {
          authUserId: user.id,
          partnerId: partnerRow.id,
          role: partnerRow.role,
          fullName: partnerRow.owner_name || partnerRow.business_name || "WE4ALL Partner",
          businessName: partnerRow.business_name || partnerRow.owner_name || "WE4ALL Partner",
          phone: partnerRow.phone || "",
          email: user.email || "",
          isGuest: false,
        };
        setCurrentUser(profile);
        setPartnerRole(partnerRow.role);
        await loadLiveCloudData(profile);
      }
    })();
  }, []);

  return (
    <>
      {toast && (
        <div className="fixed bottom-10 right-5 z-[200] rounded-lg bg-[#1e1b4b] text-white border border-indigo-400/50 px-4 py-2.5 text-xs font-bold shadow-2xl">
          {toast}
        </div>
      )}
      <WindowsDesktopApp
        appVersion={APP_VERSION}
        currentUser={currentUser}
        authenticatedPartnerRole={partnerRole}
        orders={orders}
        serviceBookings={serviceBookings}
        products={products}
        labourBookings={labourBookings}
        onPartnerSignedIn={(role, profile) => {
          setPartnerRole(role);
          setCurrentUser(profile);
          void loadLiveCloudData(profile);
        }}
        onProductAdded={(item) => setProducts((prev) => [item, ...prev])}
        onSwitchToMobile={() => { window.location.href = "/?mobile=1"; }}
        onOpenAdmin={() => { window.location.href = "/admin"; }}
        onLogout={async () => {
          if (supabase) await supabase.auth.signOut().catch(() => {});
          setCurrentUser(null);
          setPartnerRole("");
          setOrders([]);
          setProducts([]);
          showToast("Signed out of WE4ALL Windows Desktop.");
        }}
        onTriggerToast={showToast}
      />
    </>
  );
}