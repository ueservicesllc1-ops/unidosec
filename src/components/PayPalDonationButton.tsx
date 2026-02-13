import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDonation } from "../services/campaignService";
import { CheckCircle2 } from "lucide-react";

interface PayPalDonationButtonProps {
    campaignId: string;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

const PayPalDonationButton = ({ campaignId, onSuccess, onError }: PayPalDonationButtonProps) => {
    const [isPending, setIsPending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [donationAmount, setDonationAmount] = useState("25");
    const [donorName, setDonorName] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);

    const navigate = useNavigate();

    // Configuration for PRODUCTION (LIVE)
    const initialOptions = {
        clientId: "AbFdxx1dFbou0clEJYbCFuy0uQtzAoMuXLjnZsjQgeHT149wPo6ThbVPZTwQj8b7oiNZ0dEtnIAsJ8Hg", // LIVE Client ID
        currency: "USD",
        intent: "capture",
        components: "buttons",
        "enable-funding": "card,credit,paypal",
        commit: true
    };

    const createOrder = (data: any, actions: any) => {
        return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
                {
                    description: `Donación a campaña ${campaignId} - ${isAnonymous ? "Anónimo" : donorName || "Donante"}`,
                    amount: {
                        value: parseFloat(donationAmount).toFixed(2),
                        currency_code: "USD"
                    },
                },
            ],
            application_context: {
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                brand_name: "EcuFund"
            }
        });
    };

    const onApprove = async (data: any, actions: any) => {
        setIsPending(true);
        try {
            const order = await actions.order.capture();
            console.log("Order captured:", order);

            // Save Donation to Firestore
            const nameToSave = isAnonymous ? "Anónimo" : (donorName || "Anónimo");

            try {
                await addDonation(campaignId, parseFloat(donationAmount), nameToSave, isAnonymous);
            } catch (firestoreError) {
                console.error("Firestore Error (Payment successful though):", firestoreError);
            }

            if (onSuccess) onSuccess();

            // Show Success UI and Redirect
            setShowSuccess(true);

            // Wait 3 seconds then redirect to Home
            setTimeout(() => {
                navigate('/');
            }, 3000);

            // Clear fields
            setDonorName("");
            setIsAnonymous(false);
        } catch (error) {
            console.error("PayPal Capture Error:", error);
            alert("Hubo un error al procesar el pago. Por favor intenta de nuevo.");
            if (onError) onError(error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="w-full space-y-4 relative">

            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">¡Gracias por tu donación!</h3>
                        <p className="text-gray-600">
                            Has donado <span className="font-bold text-gray-900">${donationAmount}</span> exitosamente.
                        </p>
                        <p className="text-sm text-gray-500 pt-2">
                            Redirigiendo a la página principal...
                        </p>
                    </div>
                </div>
            )}

            {/* Inputs */}
            <div className={`bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 transition-opacity ${showSuccess ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto a donar ($)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                        <input
                            type="number"
                            min="1"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-lg"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
                    <input
                        type="text"
                        placeholder="Ej: Juan Pérez"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        disabled={isAnonymous}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition ${isAnonymous ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                    />
                </div>

                <div className="flex items-center">
                    <input
                        id="anonymous-checkbox"
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="anonymous-checkbox" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                        Hacer donación anónima
                    </label>
                </div>
            </div>

            {/* PayPal Buttons */}
            {!showSuccess && (
                <PayPalScriptProvider options={initialOptions}>
                    <div className="w-full relative z-0 min-h-[150px]">
                        {isPending && <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-sm font-bold text-primary rounded-lg backdrop-blur-sm shadow-sm transition-all">Procesando donación, por favor espera...</div>}

                        <PayPalButtons
                            style={{
                                layout: "vertical",
                                shape: "rect",
                                color: "gold",
                                label: "pay"
                            }}
                            createOrder={createOrder}
                            onApprove={onApprove}
                            onCancel={() => setIsPending(false)}
                            onError={(err) => {
                                console.error("PayPal Error:", err);
                                setIsPending(false);
                            }}
                            forceReRender={[donationAmount]}
                        />
                    </div>
                </PayPalScriptProvider>
            )}
        </div>
    );
};

export default PayPalDonationButton;
