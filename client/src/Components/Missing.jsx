import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Container } from "@mui/material";
import StyleIcon from "@mui/icons-material/Style";
import { useSubscriptionColors } from "../utils/getSubscriptionColors";
import "animate.css";

function Missing() {
  const navigate = useNavigate();
  const colors = useSubscriptionColors();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(-1);
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container maxWidth="md">
      <Box
        className="min-h-screen flex flex-col items-center justify-center animate__animated animate__fadeIn"
        sx={{
          textAlign: "center",
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Box
          className="
            animate__animated animate__bounceIn
            p-8 sm:p-12 md:p-16 rounded-2xl shadow-2xl
            backdrop-blur-sm
            transform hover:scale-105 transition-transform duration-300
            animate-bounce-slow
            dark:bg-dark-primary bg-light-secondary
            border
            w-full max-w-2xl mx-auto
          "
          sx={{
            borderColor: `${colors.fourth}30`,
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              background: `linear-gradient(45deg, ${colors.fourth}40, ${colors.fourth}20)`,
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
            className="animate-bounce"
            sx={{
              fontSize: { xs: 80, sm: 96, md: 120 },
              mb: 4,
              color: colors.fourth,
            }}
          />
          <Typography
            variant="h3"
            className="mb-6 font-bold animate__animated animate__fadeInDown"
            sx={{
              color: colors.fourth,
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            Runway Detour!
          </Typography>
          <Typography
            variant="h5"
            className="mb-4 animate__animated animate__fadeInUp dark:text-dark-text/80 text-light-text/80"
            sx={{
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
            }}
          >
            This runway leads nowhere...
          </Typography>
          <Typography
            variant="body1"
            className="mb-3 animate__animated animate__fadeInUp animation-delay-100 dark:text-dark-text/60 text-light-text/60"
            sx={{
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
            }}
          >
            Like last season&apos;s trends, this page is no longer available.
          </Typography>
          <Typography
            variant="body2"
            className="animate__animated animate__fadeInUp animation-delay-200 italic dark:text-dark-text/50 text-light-text/50"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem", md: "1.1rem" },
            }}
          >
            Taking you back to our latest trends in 5 seconds...
          </Typography>
          <Box className="mt-6 flex justify-center gap-3 animate__animated animate__fadeInUp animation-delay-300">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className="inline-block w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: colors.fourth, animationDelay: `${i * 200}ms` }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Missing;
