import React, { useState, useRef } from 'react';
import { Camera, DollarSign, FileText, Upload, AlertCircle, Loader2, ChevronRight, User, Heart, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCampaign, uploadImage } from '../services/campaignService';
import { useAuth } from '../context/AuthContext';

const StartCampaign = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        category: 'Salud',
        goal: '',
        description: '',
        beneficiary: 'myself',
        organizerName: user?.displayName || '',
        organizerEmail: user?.email || '',
        organizerPhone: '',
        organizerCity: 'Quito',
        organizerAddress: ''
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let imageUrl = '';
            if (selectedImage) {
                imageUrl = await uploadImage(selectedImage);
            }

            const campaignId = await createCampaign({
                title: formData.title,
                category: formData.category,
                goal: Number(formData.goal),
                description: formData.description,
                beneficiary: formData.beneficiary,
                organizer: {
                    name: formData.organizerName,
                    email: formData.organizerEmail,
                    phone: formData.organizerPhone,
                    city: formData.organizerCity,
                    address: formData.organizerAddress
                },
                imageUrl: imageUrl
            });

            navigate(`/campaign/${campaignId}`);
        } catch (error) {
            console.error(error);
            alert('Error al crear la campaña.');
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

                    {/* Section 3: Photo */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-primary border-b border-gray-100 pb-3">
                            <ImageIcon className="h-6 w-6" />
                            <h2 className="text-xl font-bold text-gray-800">3. Foto principal</h2>
                        </div>

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
                                    <p className="text-sm text-gray-500">Las campañas con fotos reales recaudan un 50% más.</p>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold bg-white/20 backdrop-blur px-4 py-2 rounded-full border border-white/50">Cambiar Foto</span>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageSelect}
                            />
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
        </div>
    );
};

export default StartCampaign;
