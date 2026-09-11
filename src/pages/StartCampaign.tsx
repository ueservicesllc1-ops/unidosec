import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, ChevronRight, User, Heart, Image as ImageIcon, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, uploadImage } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';

const StartCampaign = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Salud',
        goal: '',
        description: '',
        beneficiary: 'myself',
        videoUrl: '',
        organizerName: user?.displayName || '',
        organizerEmail: user?.email || '',
        organizerPhone: '',
        organizerCity: 'Quito',
        organizerAddress: ''
    });

    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Limit to 5MB for mobile stability
            if (file.size > 5 * 1024 * 1024) {
                alert("La imagen es muy pesada (máximo 5MB). Por favor elige una más pequeña o comprímela.");
                return;
            }

            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            // Check sizes
            const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
            if (oversized.length > 0) {
                alert("Algunas imágenes de la galería superan los 5MB y han sido descartadas.");
            }

            const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
            setGalleryImages(prev => [...prev, ...validFiles]);

            const newPreviews = validFiles.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const goalNum = Number(formData.goal);
        if (isNaN(goalNum) || goalNum <= 0) {
            alert("Por favor ingresa una meta válida (número mayor a 0).");
            return;
        }

        if (!selectedImage) {
            alert("Por favor selecciona una imagen principal para tu campaña.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Upload Main Image
            let imageUrl = '';
            if (selectedImage) {
                imageUrl = await uploadImage(selectedImage);
            }

            // 2. Upload Gallery Images (Parallel)
            let additionalImages: string[] = [];
            if (galleryImages.length > 0) {
                const uploadPromises = galleryImages.map(file => uploadImage(file));
                additionalImages = await Promise.all(uploadPromises);
            }

            // 3. Create Campaign
            const campaignId = await createCampaign({
                title: formData.title,
                category: formData.category,
                goal: Number(formData.goal),
                description: formData.description,
                beneficiary: formData.beneficiary,
                videoUrl: formData.videoUrl, // YouTube Link
                additionalImages: additionalImages, // Gallery URLs
                organizer: {
                    name: formData.organizerName,
                    email: formData.organizerEmail,
                    phone: formData.organizerPhone,
                    city: formData.organizerCity,
                    address: formData.organizerAddress
                },
                imageUrl: imageUrl
            });

            setCreatedCampaignId(campaignId);
        } catch (error: any) {
            console.error("Full error detail:", error);
            const errorMessage = error.message || "Error desconocido";

            if (errorMessage.includes("permission-denied")) {
                alert("Error de permisos: No pudimos guardar la campaña. Por favor contacta al soporte técnico.");
            } else if (errorMessage.includes("quota-exceeded")) {
                alert("El almacenamiento está lleno. Intenta con imágenes más pequeñas.");
            } else {
                alert(`Error al crear la campaña: ${errorMessage}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-[#008f5b] p-10 text-center text-white">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">Crear nueva campaña</h1>
                    <p className="opacity-90 text-lg">Tu historia puede cambiar vidas. Cuéntanosla.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-10">

                    {/* Section 1: Organizer Info */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-primary border-b border-gray-100 pb-3">
                            <User className="h-6 w-6" />
                            <h2 className="text-xl font-bold text-gray-800">1. ¿Quién organiza?</h2>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="Tu nombre real"
                                    value={formData.organizerName}
                                    onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                                    <select
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                        value={formData.organizerCity}
                                        onChange={(e) => setFormData({ ...formData, organizerCity: e.target.value })}
                                    >
                                        <option value="Quito">Quito</option>
                                        <option value="Guayaquil">Guayaquil</option>
                                        <option value="Cuenca">Cuenca</option>
                                        <option value="Manta">Manta</option>
                                        <option value="Ambato">Ambato</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                        placeholder="099..."
                                        value={formData.organizerPhone}
                                        onChange={(e) => setFormData({ ...formData, organizerPhone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Campaign Details */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-primary border-b border-gray-100 pb-3">
                            <Heart className="h-6 w-6" />
                            <h2 className="text-xl font-bold text-gray-800">2. Detalles de la causa</h2>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Título de la campaña</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                    placeholder="Ej: Ayuda para la operación de María"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                                    <select
                                        className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="Salud">Salud</option>
                                        <option value="Emergencia">Emergencia</option>
                                        <option value="Educación">Educación</option>
                                        <option value="Animales">Animales</option>
                                        <option value="Memorial">Memorial</option>
                                        <option value="Comunidad">Comunidad</option>
                                    </select>
                                    {/* Aviso obligatorio para categorías médicas */}
                                    {(formData.category === 'Salud' || formData.category === 'Emergencia') && (
                                        <div className="mt-2 flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                                            <span className="text-base mt-0.5">⚕️</span>
                                            <p className="text-xs text-blue-800 leading-relaxed">
                                                <strong>Documentación médica requerida.</strong> Para poder retirar los fondos recaudados en campañas de salud o emergencia médica, el administrador debe verificar y aprobar una <strong>certificación médica oficial</strong> emitida por un médico, hospital o clínica. Podrás subirla una vez creada tu campaña.
                                            </p>
                                        </div>
                                    )}

                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Meta ($)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            className="w-full pl-8 px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                            placeholder="5000"
                                            value={formData.goal}
                                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Historia</label>
                                <textarea
                                    rows={6}
                                    required
                                    className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
                                    placeholder="Cuéntanos con detalle por qué necesitas esta ayuda..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Photo & Gallery */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-primary border-b border-gray-100 pb-3">
                            <ImageIcon className="h-6 w-6" />
                            <h2 className="text-xl font-bold text-gray-800">3. Multimedia (Más impacto)</h2>
                        </div>

                        {/* Video Link */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Video de YouTube (Opcional)</label>
                            <input
                                type="url"
                                className="w-full px-5 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                                placeholder="https://youtube.com/watch?v=..."
                                value={formData.videoUrl}
                                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                            />
                            <p className="text-xs text-gray-400 mt-1">Los videos aumentan un 300% las donaciones. Pega tu enlace aquí.</p>
                        </div>

                        {/* Main Photo */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Principal (Portada)</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative group border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all duration-300 cursor-pointer h-64 flex flex-col items-center justify-center overflow-hidden"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="space-y-2">
                                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-2">
                                            <Camera className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-700">Sube una foto impactante</h3>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                            </div>
                        </div>

                        {/* Gallery Images */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Galería de Fotos (Opcional)</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {galleryPreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm">
                                        <img src={src} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors">
                                    <Upload className="h-6 w-6 mb-1" />
                                    <span className="text-xs font-bold">Añadir más</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleGallerySelect} />
                                </label>
                            </div>
                        </div>

                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-primary text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl hover:bg-[#008f5b] transform transition-all duration-200 flex items-center justify-center ${isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Creando...
                            </>
                        ) : (
                            <>
                                Publicar Campaña <ChevronRight className="h-6 w-6 ml-2" />
                            </>
                        )}
                    </button>

                </form>
            </div>

            <p className="text-center text-gray-400 text-sm mt-8">
                Al publicar, aceptas nuestros <a href="#" className="underline hover:text-gray-600">Términos y Condiciones</a>.
            </p>

            {/* Modal Informativo: Aprobación requerida dentro de 24 horas */}
            {createdCampaignId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 ring-8 ring-emerald-50/50">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> En proceso de revisión
                        </span>

                        <h2 className="text-2xl font-black text-gray-900 mb-3">
                            ¡Campaña creada con éxito!
                        </h2>

                        <div className="bg-amber-50/90 rounded-2xl p-4 border border-amber-200 mb-6 text-left space-y-2">
                            <p className="text-sm font-bold text-amber-900">
                                ⏳ Pronto estará visible una vez sea aprobada por los administradores dentro de 24 horas.
                            </p>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Para garantizar la veracidad, seguridad y transparencia de todas las causas recaudadas en Unidos EC, nuestro equipo administrativo revisa minuciosamente cada campaña antes de habilitarla públicamente para recibir donaciones.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => navigate(`/campaign/${createdCampaignId}`)}
                                className="flex-1 py-3.5 px-5 bg-primary text-white font-bold rounded-xl hover:bg-[#008f5b] transition shadow-md shadow-primary/20 text-sm"
                            >
                                Ver estado de mi campaña
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="py-3.5 px-5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm"
                            >
                                Ir al Inicio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StartCampaign;
