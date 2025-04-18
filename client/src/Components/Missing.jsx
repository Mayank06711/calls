import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Container } from "@mui/material";
import StyleIcon from "@mui/icons-material/Style"; // Changed to a style-related icon
import "animate.css";

function Missing() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(-1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container maxWidth='md'>
      {" "}
      <Box
        className='min-h-screen flex flex-col items-center justify-center animate__animated animate__fadeIn'
        sx={{
          textAlign: "center",
          py: { xs: 4, sm: 6, md: 8 }, // Responsive padding
        }}
      >
        <Box
          className='
            animate__animated animate__bounceIn
            p-8 sm:p-12 md:p-16 rounded-2xl shadow-2xl  /* Increased padding responsively */
            backdrop-blur-sm
            transform hover:scale-105 transition-transform duration-300
            animate-bounce-slow
            bg-gradient-to-r from-rose-50 via-neutral-100 to-rose-50
            border border-rose-100
            w-full max-w-2xl mx-auto /* Added width control */
          '
          sx={{
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              background: "linear-gradient(45deg, #fecdd3, #ffe4e6)",
              borderRadius: "1rem",
              zIndex: -1,
              filter: "blur(12px)",
              opacity: 0.4,
            },
            "&:hover::before": {
              opacity: 0.6,
              transition: "opacity 0.3s ease-in-out",
            },
          }}
        >
          <StyleIcon
            className='animate-bounce'
            sx={{
              fontSize: { xs: 80, sm: 96, md: 120 }, // Increased icon size responsively
              mb: 4,
              color: "#fb7185",
            }}
          />
          <Typography
            variant='h3'
            className='mb-6 font-bold animate__animated animate__fadeInDown'
            sx={{
              color: "#881337",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }, // Responsive font size
            }}
          >
            Runway Detour!
          </Typography>
          <Typography
            variant='h5'
            className='mb-4 animate__animated animate__fadeInUp'
            sx={{
              color: "#4a044e",
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" }, // Responsive font size
            }}
          >
            This runway leads nowhere...
          </Typography>
          <Typography
            variant='body1'
            className='mb-3 animate__animated animate__fadeInUp animation-delay-100'
            sx={{
              color: "#64748b",
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" }, // Responsive font size
            }}
          >
            Like last season&apos;s trends, this page is no longer available.
          </Typography>
          <Typography
            variant='body2'
            className='animate__animated animate__fadeInUp animation-delay-200 italic'
            sx={{
              color: "#94a3b8",
              fontSize: { xs: "0.875rem", sm: "1rem", md: "1.1rem" }, // Responsive font size
            }}
          >
            Taking you back to our latest trends in 5 seconds...
          </Typography>
          <Box className='mt-6 flex justify-center gap-3 animate__animated animate__fadeInUp animation-delay-300'>
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className='inline-block w-3 h-3 rounded-full bg-rose-300 animate-pulse'
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Missing;
