#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

declare_id!("3bgYVS545pqFRKpY4UYgmSxc997QWfivVp3j2QVqb1t8");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
