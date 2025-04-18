import React from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { Chip, Stack } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';

const SubscriptionCard = () => {
  const colors = useSubscriptionColors();
  const benefits = [
    "Unlimited Access",
    "24/7 Support",
    "Analytics",
    "Custom Integration",
    "100GB Cloud Storage",
    "Full API Access",
    "Team Management",
    "Custom Reports",
    "Automated Backups",
    "Premium Templates",
    "Advanced Security"
  ];


  const hexToRgb = (hex) => {
    hex = hex.replace(/^#/, '');
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };
  
  return (
    <div
    className={`w-96 p-8
    bg-gradient-to-br from-[${colors.first}] via-[${colors.third}] to-[${colors.fourth}]
    dark:from-[${colors.first}] dark:via-[${colors.second}] dark:to-[${colors.fourth}]
    rounded-3xl flex flex-col items-center justify-center 
    text-gray-800 dark:text-white
    transition-transform duration-300 ease-in-out 
    relative overflow-hidden shadow-xl group`}
  >
    <Stack spacing={1} className="w-full my-4 transition-all duration-200 group-hover:blur-lg group-hover:scale-125">
      {benefits.map((benefit, index) => (
             <Chip
             key={index}
             icon={<CheckIcon />}
             label={benefit}
             variant="outlined"
             sx={{
               backgroundImage: `linear-gradient(135deg, rgb(${colors.first}, 0.125), rgb(${colors.third}, 0.125))`, // 12.5% opacity
               borderColor: `rgb(${colors.first})`,
               '&:hover': {
                 backgroundImage: `linear-gradient(135deg, rgb(${colors.first}, 0.188), rgb(${colors.third}, 0.188))`, // 18.8% opacity
               },
               color: 'var(--light-primary)',
               '.dark &': {
                 color: 'var(--dark-primary)',
               },
               '& .MuiChip-icon': {
                 color: `rgb(${colors.five}, 0.8)`, // 80% opacity for icon color
               },
             }}
           />
           
           
     
      
      
      ))}
    </Stack>


      <div className="opacity-0 absolute flex flex-col items-center justify-center gap-4 transition-opacity duration-300 ease-in-out z-20 group-hover:opacity-100 text-center">
        <p className="text-xl font-extrabold tracking-wide">Ethereum</p>
        <span
          className={`text-sm text-light-primary dark:text-dark-primary`}
        >
          Cryptocurrency
        </span>
        <p
          className={`text-lg font-bold 
          bg-[${colors.fourth}] dark:bg-[${colors.first}]
          text-light-primary dark:text-dark-primary
          px-3 py-1 rounded-lg shadow-md`}
        >
          1,654.34€
        </p>
      </div>
    </div>
  );
};

export default SubscriptionCard;
